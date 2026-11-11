import type { HandFrame, HandSide } from './types'
import { HandednessFilter } from './handedness'

export interface HandFrameSample { frame: HandFrame; time: number; stableSide: HandSide | null }
type Listener = (sample: HandFrameSample) => void
export interface HandFrameSource {
  readonly current: HandFrameSample
  subscribe(listener: Listener): () => void
}

export function createHandFrameSource() {
  const handedness = new HandednessFilter()
  let current: HandFrameSample = { frame: { landmarks: [], worldLandmarks: [], handedness: [] }, time: 0, stableSide: null }
  const listeners = new Set<Listener>()
  const publish = (frame: HandFrame, time = performance.now()) => {
    current = { frame, time, stableSide: handedness.update(frame, time) }
    listeners.forEach(listener => listener(current))
  }
  return {
    get current() { return current },
    subscribe(listener: Listener) {
      listeners.add(listener)
      listener(current)
      return () => { listeners.delete(listener) }
    },
    publish,
    clear: () => {
      handedness.reset()
      publish({ landmarks: [], worldLandmarks: [], handedness: [] })
    },
  }
}
