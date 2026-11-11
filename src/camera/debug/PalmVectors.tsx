import { useCallback, type RefObject } from 'react'
import { projectPalmCenter, type PalmSample } from '../hand/palmGeometry'
import type { HandFrameSource } from '../hand/frameSource'
import { HandednessDebug } from './HandednessDebug'
import type { HandSample } from '../hand/gesture'
import type { Vector3 } from '../coordinates'
import { VectorOverlay, type DebugVectorFrame } from './VectorOverlay'
import { trackingDebugColors } from '../../ui/ui-variable'
import { uiText } from '../../ui/ui-text'

const vectors = [
  { name: 'normal', symbol: 'N', label: uiText.tracking.palmNormal, color: trackingDebugColors.normal },
  { name: 'up', symbol: 'U', label: uiText.tracking.gravityUp, color: trackingDebugColors.up, dashed: true },
] as const

export function PalmVectors({ video, mirrored, palm, hand, up, source }: {
  source: HandFrameSource; video: HTMLVideoElement; mirrored: boolean; palm: RefObject<PalmSample>
  hand: RefObject<HandSample>; up: RefObject<Vector3 | null>
}) {
  const readFrame = useCallback((width: number, height: number, time: number): DebugVectorFrame => {
    const pose = time - palm.current.time < 350 ? palm.current.pose : null
    const anchor = pose && video.videoWidth && video.videoHeight
      ? projectPalmCenter(pose, video.videoWidth, video.videoHeight, width, height, mirrored) : null
    return { anchor, values: [pose?.normal ?? null, up.current],
      highlight: !!anchor && time - hand.current.time < 350 && !!hand.current.hand?.open }
  }, [video, mirrored, palm, hand, up])
  return <VectorOverlay className="palm-vectors" vectors={vectors} readFrame={readFrame}
    header={<HandednessDebug source={source} />} mirrored={mirrored} highlightColor={trackingDebugColors.accepted} />
}
