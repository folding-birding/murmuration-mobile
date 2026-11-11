import { describe, expect, it } from 'vitest'
import { readHandSide } from '../src/camera/hand/handedness'
import type { HandFrame } from '../src/camera/hand/types'
import frames from './fixtures/palm-landmarks.json'
import { measurePalm as measurePalmWithSide, projectPalmCenter } from '../src/camera/hand/palmGeometry'

const measurePalm = (frame: HandFrame) => measurePalmWithSide(frame, readHandSide(frame))

const palm = frames.find(frame => frame.name === 'open-palm')!
const back = frames.find(frame => frame.name === 'hand-back')!

describe('palm debug geometry', () => {
  it('uses an outward unit normal with opposite depth for palm and back views', () => {
    const normal = measurePalm(palm)!.normal!
    expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1)
    expect(normal.z).toBeLessThan(0)
    expect(measurePalm(back)!.normal!.z).toBeGreaterThan(0)
  })
  it('keeps a center for uncertain geometry and does not gate on finger extension', () => {
    expect(measurePalm({ landmarks: [], worldLandmarks: [], handedness: [] })).toBeNull()
    const folded = structuredClone(palm)
    for (const tip of [8, 12, 16, 20]) folded.worldLandmarks[0][tip] = { ...folded.worldLandmarks[0][0] }
    expect(measurePalm(folded)).toEqual(measurePalm(palm))
    const invalid = structuredClone(palm)
    invalid.worldLandmarks[0][5].z = NaN
    expect(measurePalm(invalid)).toMatchObject({ normal: null })
    invalid.landmarks[0][5].x = NaN
    expect(measurePalm(invalid)).toBeNull()
    expect(measurePalm({ ...palm, handedness: [] })).toMatchObject({ normal: null })
    const imageDepthMissing = structuredClone(palm)
    imageDepthMissing.landmarks[0][5].z = NaN
    expect(measurePalm(imageDepthMissing)).toEqual(measurePalm(palm))
  })
  it('handles opposite handedness and reflected geometry', () => {
    const other = structuredClone(palm)
    other.handedness[0][0].categoryName = 'Right'
    for (const p of other.worldLandmarks[0]) p.x *= -1
    for (const p of other.landmarks[0]) p.x = 1 - p.x
    const a = measurePalm(palm)!, b = measurePalm(other)!
    expect(b.normal!.x).toBeCloseTo(-a.normal!.x)
    expect(b.normal!.z).toBeCloseTo(a.normal!.z)
    expect(a.x + b.x).toBeCloseTo(1)
  })
  it('projects the palm center symmetrically for mirrored camera views', () => {
    const pose = measurePalm(palm)!
    for (const [width, height] of [[390, 724], [724, 390]]) {
      const a = projectPalmCenter(pose, 640, 960, width, height, false)
      const b = projectPalmCenter(pose, 640, 960, width, height, true)
      expect(a.x + b.x).toBeCloseTo(width)
      expect(a.y).toBe(b.y)
    }
  })
})
