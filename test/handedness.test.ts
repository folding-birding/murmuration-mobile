import { describe, expect, it } from 'vitest'
import { HandednessFilter } from '../src/camera/hand/handedness'
import { openHand } from './fixtures/open-hand'
import type { HandFrame, HandSide } from '../src/camera/hand/types'

const absent: HandFrame = { landmarks: [], worldLandmarks: [], handedness: [] }
const label = (side: HandSide, score = .99) => {
  const frame = openHand()
  frame.handedness[0][0] = { ...frame.handedness[0][0], categoryName: side, score }
  return frame
}
const lock = (filter: HandednessFilter) => {
  expect(filter.update(openHand(), 0)).toBeNull()
  expect(filter.update(openHand(), 99)).toBeNull()
  expect(filter.update(openHand(), 100)).toBe('Right')
  expect(filter.update(openHand(), 200)).toBe('Right')
}

describe('handedness stabilization', () => {
  it('acquires at 75% confidence after 100 ms without counting lower-confidence samples', () => {
    const filter = new HandednessFilter()
    expect(filter.update(label('Right', .749), 0)).toBeNull()
    expect(filter.update(label('Right', .75), 100)).toBeNull()
    expect(filter.update(label('Right', .75), 199)).toBeNull()
    expect(filter.update(label('Right', .75), 200)).toBe('Right')
  })
  it('holds the accepted side through uncertain, invalid, and missing labels', () => {
    const filter = new HandednessFilter(); lock(filter)
    const missing = openHand(); missing.handedness = []
    const frames = [label('Left', .55), label('Left', .89), label('Left', NaN), label('Left', 2), missing]
    for (let i = 0; i < 30; i++) expect(filter.update(frames[i % frames.length], 300 + i * 100)).toBe('Right')
  })
  it('rejects brief high-confidence flips and requires continuous opposite evidence', () => {
    const filter = new HandednessFilter(); lock(filter)
    for (let i = 0; i < 12; i++) expect(filter.update(label(i % 2 ? 'Right' : 'Left'), 300 + i * 100)).toBe('Right')
    for (let time = 1500; time < 2500; time += 100) expect(filter.update(label('Left', .9), time)).toBe('Right')
    expect(filter.update(label('Left', .9), 2499)).toBe('Right')
    expect(filter.update(label('Left', .9), 2500)).toBe('Left')
  })
  it('does not count low confidence or skipped frames toward a switch', () => {
    const filter = new HandednessFilter(); lock(filter)
    for (let time = 300; time <= 900; time += 100) filter.update(label('Left'), time)
    expect(filter.update(label('Left', .7), 1000)).toBe('Right')
    expect(filter.update(label('Left'), 1100)).toBe('Right')
    expect(filter.update(label('Left'), 1900)).toBe('Right')
    for (let time = 2000; time < 2900; time += 100) expect(filter.update(label('Left'), time)).toBe('Right')
    expect(filter.update(label('Left'), 2900)).toBe('Left')
  })
  it('retains a short dropout but resets after one second or an explicit restart', () => {
    const filter = new HandednessFilter(); lock(filter)
    expect(filter.update(absent, 300)).toBeNull()
    expect(filter.update(label('Left', .5), 700)).toBe('Right')
    expect(filter.update(absent, 1700)).toBeNull()
    expect(filter.update(label('Left', .5), 1800)).toBeNull()
    for (const time of [1900, 2000, 2100]) filter.update(label('Left'), time)
    expect(filter.update(label('Left'), 2200)).toBe('Left')
    filter.reset()
    expect(filter.update(label('Left', .5), 2300)).toBeNull()
  })
  it('resets after a long gap even if no absent frame was delivered', () => {
    const filter = new HandednessFilter(); lock(filter)
    expect(filter.update(label('Left'), 1200)).toBeNull()
    expect(filter.update(label('Left'), 1299)).toBeNull()
    expect(filter.update(label('Left'), 1300)).toBe('Left')
  })
})
