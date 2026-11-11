import type { ReactNode, RefObject } from 'react'
import type { HandFrameSource } from '../hand/frameSource'
import type { TrackingMetrics, TrackingStatus } from '../hand/types'
import type { PalmSample } from '../hand/palmGeometry'
import type { HandSample } from '../hand/gesture'
import type { Vector3 } from '../coordinates'
import { HandTrackingOverlay } from './HandTrackingOverlay'
import { PalmVectors } from './PalmVectors'
import './debug.css'

export function DebugFrame({ enabled = true, video, mirrored, source, status, metrics, palm, hand, up, children }: {
  children?: ReactNode; enabled?: boolean; video: HTMLVideoElement; mirrored: boolean; source: HandFrameSource
  status: TrackingStatus; metrics: TrackingMetrics | null; palm: RefObject<PalmSample>
  hand: RefObject<HandSample>; up: RefObject<Vector3 | null>
}) {
  if (!enabled) return null
  return <div className="debug-frame">
    <div aria-hidden="true">
      <HandTrackingOverlay video={video} mirrored={mirrored} source={source} status={status} metrics={metrics} />
      <PalmVectors source={source} video={video} mirrored={mirrored} palm={palm} hand={hand} up={up} />
    </div>
    {children}
  </div>
}
