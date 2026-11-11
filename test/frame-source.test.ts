import { describe, expect, it, vi } from 'vitest'
import { createHandFrameSource } from '../src/camera/hand/frameSource'
import type { HandFrame } from '../src/camera/hand/types'

const frame = (x = 0): HandFrame => ({
  landmarks: [[{ x, y: 0, z: 0, visibility: 0 }]], worldLandmarks: [], handedness: [],
})

describe('hand frame subscriptions', () => {
  it('keeps interaction updates running when the debug subscriber is removed', () => {
    const source = createHandFrameSource()
    const interaction = vi.fn()
    const debug = vi.fn()
    const stopInteraction = source.subscribe(interaction)
    const stopDebug = source.subscribe(debug)
    source.publish(frame(), 100)
    stopDebug()
    source.publish(frame(1), 200)
    expect(interaction).toHaveBeenCalledTimes(3)
    expect(interaction).toHaveBeenLastCalledWith(source.current)
    expect(debug).toHaveBeenCalledTimes(2)
    stopInteraction()
    source.clear()
    expect(interaction).toHaveBeenCalledTimes(3)
  })

  it('delivers the latest frame on subscription and clears stale hand data', () => {
    const source = createHandFrameSource()
    const latest = frame()
    source.publish(latest, 123)
    const listener = vi.fn()
    source.subscribe(listener)
    expect(listener).toHaveBeenCalledWith({ frame: latest, time: 123, stableSide: null })
    source.clear()
    expect(source.current.frame).toEqual({ landmarks: [], worldLandmarks: [], handedness: [] })
    expect(listener).toHaveBeenLastCalledWith(source.current)
  })
})
