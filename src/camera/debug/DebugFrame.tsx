import type { HandFrameSource } from '../hand/frameSource'
import type { TrackingMetrics, TrackingStatus } from '../hand/types'
import { HandTrackingOverlay } from './HandTrackingOverlay'
import { HandednessDebug } from './HandednessDebug'
import './debug.css'

export function DebugFrame({ enabled = true, video, mirrored, source, status, metrics }: {
  enabled?: boolean; video: HTMLVideoElement; mirrored: boolean; source: HandFrameSource
  status: TrackingStatus; metrics: TrackingMetrics | null
}) {
  if (!enabled) return null
  return <div className="debug-frame" aria-hidden="true">
    <HandTrackingOverlay video={video} mirrored={mirrored} source={source} status={status} metrics={metrics} />
    <div className="vector-debug"><HandednessDebug source={source} /></div>
  </div>
}
