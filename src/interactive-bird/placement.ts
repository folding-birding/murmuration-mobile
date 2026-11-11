import { coverTransform, type Vector3 } from '../camera/coordinates'
import { projectPalmCenter } from '../camera/hand/palmGeometry'
import type { HandObservation } from '../camera/hand/gesture'
import { interactiveBirdSettings as settings } from './settings'

export function birdTarget(hand: HandObservation, up: Vector3, sourceWidth: number, sourceHeight: number, width: number, height: number, mirrored: boolean) {
  const center = projectPalmCenter(hand.pose, sourceWidth, sourceHeight, width, height, mirrored)
  const fit = coverTransform(sourceWidth, sourceHeight, width, height)
  // Weak-perspective scale estimate from palm dimensions; this is not calibrated metric AR.
  const scale = hand.spanPixels / hand.spanMeters * fit.width / sourceWidth
  if (!Number.isFinite(scale) || scale <= 0) return null
  return { x: center.x + up.x * (mirrored ? -1 : 1) * settings.hoverMeters * scale,
    y: center.y + up.y * settings.hoverMeters * scale,
    size: Math.max(60, Math.min(Math.min(width, height) * 0.7, scale * settings.sizeMeters)) }
}

export function departureOffset(up: Vector3 | null, width: number, height: number, size: number, mirrored: boolean) {
  const distance = Math.hypot(width, height) + size * 2
  return { x: (up?.x ?? 0) * (mirrored ? -1 : 1) * distance, y: (up?.y ?? 0) * distance }
}
