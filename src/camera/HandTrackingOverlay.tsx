import { useEffect, useRef, useState } from 'react'
import { startHandTracking, type TrackingStatus, type TrackingMetrics } from './handTracking'
import { Icon } from '../ui/Icon'
import { uiText } from '../ui/ui-text'

export function HandTrackingOverlay({ video, mirrored }: { video: HTMLVideoElement; mirrored: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<TrackingStatus>('loading')
  const [metrics, setMetrics] = useState<TrackingMetrics | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    setStatus('loading')
    setMetrics(null)
    try {
      return startHandTracking(video, element, setStatus, setMetrics)
    } catch {
      setStatus('failed')
    }
  }, [video, attempt])

  return <>
    <canvas ref={canvas} className="hand-overlay" data-mirrored={mirrored} data-state={status} aria-hidden="true" />
    <div className="tracking-debug" aria-live="off">
      <div>{uiText.tracking.cameraSize} <span data-metric="camera">{metrics?.cameraWidth ?? video.videoWidth} × {metrics?.cameraHeight ?? video.videoHeight}</span></div>
      <div>{uiText.tracking.inputSize} <span data-metric="input">{metrics?.inputWidth ? `${metrics.inputWidth} × ${metrics.inputHeight}` : '—'}</span></div>
      <div>{uiText.tracking.frameRate} <span data-metric="fps">{status === 'ready' && metrics ? metrics.fps.toFixed(1) : '—'}</span> FPS</div>
    </div>
    {status !== 'ready' && <div className="tracking-status" role="status">
      {status === 'loading' ? <span className="spinner" aria-hidden="true" /> : <button type="button" className="icon-button"
        aria-label={uiText.tracking.retry} onClick={() => setAttempt(value => value + 1)}><Icon name="retry" /></button>}
      <span className="sr-only">{uiText.tracking[status]}</span>
    </div>}
  </>
}
