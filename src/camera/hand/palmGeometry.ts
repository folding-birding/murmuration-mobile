import type { HandFrame, HandSide } from './types'
import { coverTransform, type Vector3 } from '../coordinates'

export interface PalmGeometry { x: number; y: number; normal: Vector3 | null }
export interface PalmSample { pose: PalmGeometry | null; time: number }

export function measurePalm(frame: HandFrame, side: HandSide | null): PalmGeometry | null {
  const hand = frame.landmarks[0], world = frame.worldLandmarks[0]
  if (hand?.length !== 21 || !hand.every(p => [p.x, p.y].every(Number.isFinite))) return null
  let normal: Vector3 | null = null
  if (world?.length === 21 && world.every(p => [p.x, p.y, p.z].every(Number.isFinite))) {
    const a = { x: world[5].x - world[0].x, y: world[5].y - world[0].y, z: world[5].z - world[0].z }
    const b = { x: world[17].x - world[0].x, y: world[17].y - world[0].y, z: world[17].z - world[0].z }
    const cross = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
    const norm = Math.hypot(cross.x, cross.y, cross.z)
    // Outward palm normal in unmirrored camera coordinates; handedness disambiguates its sign.
    const sign = side === 'Left' ? -1 : side === 'Right' ? 1 : 0
    if (norm > 0.00001 && sign) normal = { x: cross.x * sign / norm, y: cross.y * sign / norm, z: cross.z * sign / norm }
  }
  const center = [0, 5, 9, 13, 17].map(index => hand[index])
  return { x: center.reduce((sum, p) => sum + p.x, 0) / center.length,
    y: center.reduce((sum, p) => sum + p.y, 0) / center.length, normal }
}

export function projectPalmCenter(pose: PalmGeometry, sourceWidth: number, sourceHeight: number, width: number, height: number, mirrored: boolean) {
  const fit = coverTransform(sourceWidth, sourceHeight, width, height)
  const x = fit.x + pose.x * fit.width
  return { x: mirrored ? width - x : x, y: fit.y + pose.y * fit.height }
}
