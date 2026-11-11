import type { HandFrame, TrackingMetrics, TrackingStatus, TrackingDelegate, TrackingRequest, TrackingResponse } from './types'

export function startHandTracking(video: HTMLVideoElement, onStatus: (status: TrackingStatus) => void, onMetrics: (metrics: TrackingMetrics) => void, requestedDelegate: TrackingDelegate, onFrame: (frame: HandFrame) => void) {
  if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') throw new Error('Hand tracking is not supported')
  const worker = new Worker(new URL('./tracking.worker.ts', import.meta.url), { type: 'module' })
  let disposed = false
  let busy = false
  let animation = 0
  let lastTime = -1
  let delegate: TrackingDelegate = 'CPU'
  let inferenceTime = 0
  let totalTime = 0
  let frameStarted = 0
  let completedFrames = 0
  let inputWidth = 0
  let inputHeight = 0
  let metricsTimer: ReturnType<typeof setInterval> | undefined
  let timeout: ReturnType<typeof setTimeout>
  const stop = () => {
    disposed = true
    clearTimeout(timeout)
    clearInterval(metricsTimer)
    cancelAnimationFrame(animation)
    worker.terminate()
  }
  const fail = () => {
    if (disposed) return
    stop()
    onStatus('failed')
  }
  worker.onerror = fail
  worker.onmessageerror = fail
  timeout = setTimeout(fail, 60_000)

  const tick = (timestamp: number) => {
    if (disposed) return
    animation = requestAnimationFrame(tick)
    if (busy || video.readyState < 2 || video.paused || document.hidden || video.currentTime === lastTime) return
    busy = true
    frameStarted = performance.now()
    lastTime = video.currentTime
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight))
    timeout = setTimeout(fail, 10_000)
    void Promise.resolve().then(() => createImageBitmap(video, {
      resizeWidth: Math.max(1, Math.round(video.videoWidth * scale)),
      resizeHeight: Math.max(1, Math.round(video.videoHeight * scale)),
    }))
      .then(frame => {
        if (disposed) { frame.close(); return }
        try {
          inputWidth = frame.width
          inputHeight = frame.height
          const message: TrackingRequest = { type: 'frame', frame, timestamp }
          worker.postMessage(message, [frame])
        } catch {
          frame.close()
          fail()
        }
      }).catch(fail)
  }
  worker.onmessage = ({ data }: MessageEvent<TrackingResponse>) => {
    if (disposed) return
    clearTimeout(timeout)
    if (data.type === 'error') { fail(); return }
    if (data.type === 'ready') {
      delegate = data.delegate
      onStatus('ready')
      metricsTimer = setInterval(() => {
        onMetrics({
          cameraWidth: video.videoWidth, cameraHeight: video.videoHeight,
          inputWidth, inputHeight,
          delegate, inferenceMs: completedFrames ? inferenceTime / completedFrames : null,
          totalMs: completedFrames ? totalTime / completedFrames : null,
        })
        inferenceTime = 0
        totalTime = 0
        completedFrames = 0
      }, 1000)
      animation = requestAnimationFrame(tick)
    } else {
      busy = false
      completedFrames++
      inferenceTime += data.inferenceMs
      onFrame(data)
      totalTime += performance.now() - frameStarted
    }
  }
  const init: TrackingRequest = { type: 'init', delegate: requestedDelegate }
  worker.postMessage(init)
  return stop
}
