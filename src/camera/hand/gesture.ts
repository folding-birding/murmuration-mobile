import type { HandFrame, HandSide } from './types'
import type { PalmGeometry } from './palmGeometry'

export interface HandObservation {
  pose: PalmGeometry
  side: HandSide | null
  open: boolean
  spanPixels: number
  spanMeters: number
}
export interface HandSample { hand: HandObservation | null; time: number }

export function observeHand(frame: HandFrame, width: number, height: number, pose: PalmGeometry | null, side: HandSide | null): HandObservation | null {
  if (!pose) return null
  const points = frame.landmarks[0].map(p => ({ x: p.x * width, y: p.y * height }))
  const distance = (a: number, b: number) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y)
  const world = frame.worldLandmarks[0]
  const validWorld = world?.length === 21 && world.every(p => [p.x, p.y, p.z].every(Number.isFinite))
  const worldDistance = (a: number, b: number) => validWorld
    ? Math.hypot(world[a].x - world[b].x, world[a].y - world[b].y, world[a].z - world[b].z) : NaN
  const straight = (indices: number[]) => {
    const length = indices.slice(1).reduce((sum, index, i) => sum + worldDistance(indices[i], index), 0)
    return length > 0 && worldDistance(indices[0], indices.at(-1)!) / length >= 0.75
  }
  const widthPixels = distance(5, 17)
  const ax = points[5].x - points[0].x, ay = points[5].y - points[0].y
  const bx = points[17].x - points[0].x, by = points[17].y - points[0].y
  // Image-plane winding and handedness distinguish palm/back without relying on inferred Z.
  const facing = (ax * by - ay * bx) * (side === 'Left' ? -1 : 1) / (distance(0, 5) * distance(0, 17) || 1)
  const fingers = [1, 5, 9, 13, 17].every(base => straight([base, base + 1, base + 2, base + 3]))
  const spanMeters = worldDistance(5, 17) + worldDistance(0, 9)
  return { pose, side, open: side !== null && facing < -0.18 && fingers,
    spanPixels: widthPixels + distance(0, 9), spanMeters }
}
