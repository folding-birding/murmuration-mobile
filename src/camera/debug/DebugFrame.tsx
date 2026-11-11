import { useCallback, type RefObject } from 'react'
import type { Vector3 } from '../coordinates'
import { VectorOverlay } from './VectorOverlay'
import { trackingDebugColors } from '../../ui/ui-variable'
import { uiText } from '../../ui/ui-text'
import type { HandFrameSource } from '../hand/frameSource'
import type { TrackingMetrics, TrackingStatus } from '../hand/types'
import { HandTrackingOverlay } from './HandTrackingOverlay'
import { HandednessDebug } from './HandednessDebug'
import './debug.css'

const vectors = [{ name: 'up', symbol: 'U', label: uiText.tracking.gravityUp, color: trackingDebugColors.up, dashed: true }] as const

export function DebugFrame({ enabled = true, video, mirrored, source, status, metrics, up }: {
  enabled?: boolean; video: HTMLVideoElement; mirrored: boolean; source: HandFrameSource
  status: TrackingStatus; metrics: TrackingMetrics | null; up: RefObject<Vector3 | null>
}) {
  const readFrame = useCallback((width: number, height: number) => ({
    anchor: { x: width / 2, y: height / 2 }, values: [up.current],
  }), [up])
  if (!enabled) return null
  return <div className="debug-frame" aria-hidden="true">
    <HandTrackingOverlay video={video} mirrored={mirrored} source={source} status={status} metrics={metrics} />
    <VectorOverlay header={<HandednessDebug source={source} />} vectors={vectors} readFrame={readFrame} mirrored={mirrored} />
  </div>
}
