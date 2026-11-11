import { describe, expect, it } from 'vitest'
import { createHandFrameSource } from '../src/camera/hand/frameSource'
import { readHandSide } from '../src/camera/hand/handedness'
import { openHand } from './fixtures/open-hand'
import { observeHand } from '../src/camera/hand/gesture'
import { measurePalm } from '../src/camera/hand/palmGeometry'
import type { HandFrame } from '../src/camera/hand/types'

const observe = (frame: HandFrame) => observeHand(frame, 640, 480, measurePalm(frame, readHandSide(frame)), readHandSide(frame))

describe('3D hand gesture', () => {
  it('accepts extended palms on both hands but rejects the back and curled required fingers', () => {
    for (const side of ['Left', 'Right'] as const) expect(observe(openHand(side))?.open).toBe(true)
    const back = openHand(); back.handedness[0][0].categoryName = 'Left'
    expect(observe(back)?.open).toBe(false)
    for (const tip of [4,8,12,16,20]) {
      const folded = openHand(); folded.worldLandmarks[0][tip] = {...folded.worldLandmarks[0][tip-3]}
      expect(observe(folded)?.open).toBe(false)
    }
    const depth = openHand(); depth.worldLandmarks[0].forEach((p,i)=>{p.z=i%2 ? .1 : -.1})
    expect(observe(depth)?.open).toBe(false)
  })
  it('ignores finger spread, including a straight tucked thumb', () => {
    const frame = openHand()
    const points = frame.worldLandmarks[0]
    for (const base of [5,9,13,17]) {
      for (let step=1;step<=3;step++) points[base+step] = { ...points[base], y: points[base].y-step*.04 }
    }
    const start = { ...points[1] }, end = { ...points[5] }
    for (let step=1;step<=3;step++) points[1+step] = {
      ...start, x: start.x+(end.x-start.x)*step/3, y: start.y+(end.y-start.y)*step/3,
    }
    expect(observe(frame)?.open).toBe(true)
  })
  it('accepts the exact 75 percent boundary and rejects a shorter base-to-tip distance', () => {
    const frame = openHand()
    for (const [i,x] of [0.5,0.609375,0.578125,0.6875].entries()) frame.worldLandmarks[0][5+i] = {x,y:.55,z:0,visibility:0}
    expect(observe(frame)?.open).toBe(true)
    frame.worldLandmarks[0][8].x -= .001
    expect(observe(frame)?.open).toBe(false)
  })
  it('keeps extension unchanged under 3D rotation and translation, even with foreshortened image fingers', () => {
    for (const angle of [0, Math.PI/4, Math.PI/2, Math.PI*.8]) {
      const frame = openHand()
      for (const p of frame.worldLandmarks[0]) {
        const y = p.y, z = p.z
        p.x += .3
        p.y = y*Math.cos(angle)-z*Math.sin(angle)+.2
        p.z = y*Math.sin(angle)+z*Math.cos(angle)-.4
      }
      for (const base of [1,5,9,13,17]) {
        for (let offset=1;offset<=3;offset++) frame.landmarks[0][base+offset] = {...frame.landmarks[0][base]}
      }
      expect(observe(frame)?.open).toBe(true)
    }
  })
  it('keeps a tracked hand when handedness is missing or unreliable without accepting a gesture', () => {
    for (const score of [0.59, NaN]) {
      const frame = openHand(); frame.handedness[0][0].score = score
      expect(observe(frame)).toMatchObject({ side: null, open: false, pose: { normal: null } })
    }
    const missing = openHand(); missing.handedness = []
    expect(observe(missing)).toMatchObject({ side: null, open: false, pose: { normal: null } })
    expect(observe({ landmarks: [], worldLandmarks: [], handedness: [] })).toBeNull()
  })
  it('rejects missing, invalid and zero-length 3D fingers without falling back to the image', () => {
    const missing = openHand(); missing.worldLandmarks = []
    expect(observe(missing)?.open).toBe(false)
    const invalid = openHand(); invalid.worldLandmarks[0][8].z = NaN
    expect(observe(invalid)?.open).toBe(false)
    const collapsed = openHand()
    for (const i of [6,7,8]) collapsed.worldLandmarks[0][i] = {...collapsed.worldLandmarks[0][5]}
    expect(observe(collapsed)?.open).toBe(false)
  })
  it('feeds one accepted side to the normal and gesture without changing raw output', () => {
    const source = createHandFrameSource()
    for (const time of [0, 100, 200]) source.publish(openHand(), time)
    const before = measurePalm(source.current.frame, source.current.stableSide)!
    const opposite = openHand(); opposite.handedness[0][0].categoryName = 'Left'
    source.publish(opposite, 300)
    const { frame, stableSide } = source.current
    expect(frame).toBe(opposite)
    expect(frame.handedness[0][0].categoryName).toBe('Left')
    expect(stableSide).toBe('Right')
    const pose = measurePalm(frame, stableSide)!
    expect(pose.normal).toEqual(before.normal)
    expect(observeHand(frame, 640, 480, pose, stableSide)).toMatchObject({ side: 'Right', open: true })
    source.clear()
    expect(source.current.stableSide).toBeNull()
    opposite.handedness[0][0].score = .5
    source.publish(opposite)
    expect(source.current.stableSide).toBeNull()
  })
})
