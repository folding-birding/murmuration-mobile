import { drawHands, type HandFrame } from './handGeometry'

export interface TrackingMetrics {
  cameraWidth: number
  cameraHeight: number
  inputWidth: number
  inputHeight: number
  fps: number
}

export type TrackingStatus = 'loading' | 'ready' | 'failed'
export type TrackingRequest = { type: 'init' } | { type: 'frame'; frame: ImageBitmap; timestamp: number }
export type TrackingResponse = { type: 'ready' } | { type: 'error' } | ({ type: 'result' } & HandFrame)

export function startHandTracking(video: HTMLVideoElement, canvas: HTMLCanvasElement, onStatus: (status: TrackingStatus) => void, onMetrics: (metrics: TrackingMetrics) => void) {
  if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') throw new Error('Hand tracking is not supported')
  const worker = new Worker(new URL('./handTracking.worker.ts', import.meta.url), { type: 'module' })
  let disposed = false
  let busy = false
  let animation = 0
  let lastTime = -1
  let completedFrames = 0
  let measuredAt = 0
  let inputWidth = 0
  let inputHeight = 0
  let metricsTimer: ReturnType<typeof setInterval> | undefined
  let result: HandFrame = { landmarks: [], worldLandmarks: [] }
  let timeout: ReturnType<typeof setTimeout>
  const clear = () => {
    canvas.width = canvas.width
    canvas.dataset.hands = '0'
  }
  const stop = () => {
    disposed = true
    clearTimeout(timeout)
    clearInterval(metricsTimer)
    cancelAnimationFrame(animation)
    resize.disconnect()
    worker.terminate()
    clear()
  }
  const fail = () => {
    if (disposed) return
    stop()
    onStatus('failed')
  }
  const resize = new ResizeObserver(() => drawHands(canvas, video, result))
  resize.observe(canvas)
  worker.onerror = fail
  worker.onmessageerror = fail
  timeout = setTimeout(fail, 60_000)

  const tick = (timestamp: number) => {
    if (disposed) return
    animation = requestAnimationFrame(tick)
    if (busy || video.readyState < 2 || video.paused || document.hidden || video.currentTime === lastTime) return
    busy = true
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
      onStatus('ready')
      measuredAt = performance.now()
      metricsTimer = setInterval(() => {
        const now = performance.now()
        onMetrics({
          cameraWidth: video.videoWidth, cameraHeight: video.videoHeight,
          inputWidth, inputHeight, fps: completedFrames * 1000 / (now - measuredAt),
        })
        completedFrames = 0
        measuredAt = now
      }, 1000)
      animation = requestAnimationFrame(tick)
    } else {
      busy = false
      completedFrames++
      result = data
      canvas.dataset.hands = String(result.landmarks.length)
      drawHands(canvas, video, result)
    }
  }
  const init: TrackingRequest = { type: 'init' }
  worker.postMessage(init)
  return stop
}
