import type { TrackingMetrics, TrackingStatus } from '../hand/types'
import { uiText } from '../../ui/ui-text'
import './debug.css'

const duration = (ms: number | null) => ms == null ? '—' : ms.toFixed(1)
const rate = (ms: number | null) => ms != null && ms > 0 ? (1000 / ms).toFixed(1) : '—'

export function TrackingDebug({ video, status, metrics }: {
  video: HTMLVideoElement; status: TrackingStatus; metrics: TrackingMetrics | null
}) {
  const inference = status === 'ready' ? metrics?.inferenceMs ?? null : null
  const total = status === 'ready' ? metrics?.totalMs ?? null : null
  return <div className="tracking-debug" aria-live="off">
    <div>{uiText.tracking.cameraSize} <span data-metric="camera">{metrics?.cameraWidth ?? video.videoWidth} × {metrics?.cameraHeight ?? video.videoHeight}</span></div>
    <div>{uiText.tracking.inputSize} <span data-metric="input">{metrics?.inputWidth ? `${metrics.inputWidth} × ${metrics.inputHeight}` : '—'}</span></div>
    <div>{uiText.tracking.frameRate} (<span data-metric="delegate">{status === 'ready' && metrics ? metrics.delegate : '—'}</span>) <span data-metric="inference" aria-label={uiText.tracking.inferenceTime}>{duration(inference)}</span> ms / <span data-metric="fps">{rate(inference)}</span> FPS</div>
    <div>{uiText.tracking.totalTime} <span data-metric="total">{duration(total)}</span> ms / <span data-metric="total-fps">{rate(total)}</span> FPS</div>
  </div>
}
