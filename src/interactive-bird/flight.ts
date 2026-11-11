import type { HandSample } from '../camera/hand/gesture'
import type { HandSide } from '../camera/hand/types'
import { interactiveBirdSettings as settings } from './settings'

export type FlightPhase = 'hidden' | 'arriving' | 'hovering' | 'leaving'

export class BirdFlight {
  phase: FlightPhase = 'hidden'
  side: HandSide = 'Right'
  phaseStarted = 0
  private lastSample = -Infinity
  private lastSeen = -Infinity
  private lastOpen = -Infinity
  private evidence = 0
  private candidate: HandSide | null = null
  private previousOpen = false

  step(time: number, sample: HandSample, canArrive: boolean) {
    if (time - this.lastOpen > settings.gestureGraceMs) this.resetGesture()
    if (sample.time !== this.lastSample) {
      const dt = sample.time - this.lastSample
      const hand = sample.hand
      if (hand) this.lastSeen = sample.time
      if (hand?.open && hand.side) {
        if (this.candidate !== hand.side) this.evidence = 0
        if (this.previousOpen && this.candidate === hand.side && dt <= settings.sampleGapMs) this.evidence += Math.max(0, dt)
        this.candidate = hand.side
        this.lastOpen = sample.time
      }
      this.previousOpen = !!(hand?.open && hand.side)
      this.lastSample = sample.time
    }
    if (this.phase === 'hidden' && canArrive && this.evidence >= settings.confirmMs && this.candidate) {
      this.side = this.candidate
      this.enter('arriving', time)
    } else if ((this.phase === 'arriving' || this.phase === 'hovering') && time - this.lastSeen >= settings.missingMs) {
      this.enter('leaving', time)
    } else if (this.phase === 'arriving' && time - this.phaseStarted >= settings.travelMs) {
      this.enter('hovering', time)
    } else if (this.phase === 'leaving' && time - this.phaseStarted >= settings.travelMs) {
      this.enter('hidden', time)
      this.resetGesture()
    }
    return this.phase
  }

  private resetGesture() {
    this.evidence = 0
    this.candidate = null
    this.previousOpen = false
  }

  private enter(phase: FlightPhase, time: number) { this.phase = phase; this.phaseStarted = time }
}

export function follow(current: number, target: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-dt / settings.followSeconds))
}

export function flightCorner(side: HandSide, width: number, size: number) {
  return { x: side === 'Right' ? width + size : -size, y: -size }
}
