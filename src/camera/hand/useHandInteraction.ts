import { useEffect, useRef } from 'react'
import type { HandFrameSource } from './frameSource'
import { measurePalm, type PalmSample } from './palmGeometry'
import { observeHand, type HandSample } from './gesture'

export function useHandInteraction(source: HandFrameSource, video: HTMLVideoElement) {
  const palm = useRef<PalmSample>({ pose: null, time: 0 })
  const hand = useRef<HandSample>({ hand: null, time: 0 })
  useEffect(() => source.subscribe(({ frame, time, stableSide }) => {
    const pose = measurePalm(frame, stableSide)
    palm.current = { pose, time }
    hand.current = { hand: observeHand(frame, video.videoWidth, video.videoHeight, pose, stableSide), time }
  }), [source, video])
  return { palm, hand }
}
