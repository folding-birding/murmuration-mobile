import type { HandFrame, HandSide } from './types'

export const handednessSettings = {
  acquireConfidence: 0.75,
  switchConfidence: 0.9,
  acquireMs: 100,
  switchMs: 1000,
  maxSampleGapMs: 250,
  lostMs: 1000,
} as const

export function readHandSide(frame: HandFrame, minConfidence: number = handednessSettings.acquireConfidence): HandSide | null {
  const label = frame.handedness[0]?.[0]
  return label && Number.isFinite(label.score) && label.score >= minConfidence && label.score <= 1
    && (label.categoryName === 'Left' || label.categoryName === 'Right') ? label.categoryName : null
}

export class HandednessFilter {
  private side: HandSide | null = null
  private candidate: { side: HandSide; since: number } | null = null
  private lastSeen = -Infinity

  reset() {
    this.side = null
    this.candidate = null
    this.lastSeen = -Infinity
  }

  update(frame: HandFrame, time: number): HandSide | null {
    if (!Number.isFinite(time)) { this.reset(); return null }
    const gap = time - this.lastSeen
    if (gap < 0 || gap >= handednessSettings.lostMs) this.reset()
    if (gap > handednessSettings.maxSampleGapMs) this.candidate = null
    const points = frame.landmarks[0]
    if (points?.length !== 21 || !points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) {
      this.candidate = null
      return null
    }
    this.lastSeen = time
    const side = readHandSide(frame, this.side ? handednessSettings.switchConfidence : handednessSettings.acquireConfidence)
    if (!side || side === this.side) {
      this.candidate = null
      return this.side
    }
    if (this.candidate?.side !== side) this.candidate = { side, since: time }
    const duration = this.side ? handednessSettings.switchMs : handednessSettings.acquireMs
    if (time - this.candidate.since >= duration) {
      this.side = side
      this.candidate = null
    }
    return this.side
  }
}
