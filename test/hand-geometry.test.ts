import { describe, expect, it } from 'vitest'
import { coverTransform } from '../src/camera/handGeometry'

describe('camera cover crop', () => {
  it('crops horizontal video equally on both sides in portrait', () => {
    const fit = coverTransform(1280, 720, 390, 724)
    expect(fit.height).toBe(724)
    expect(fit.x).toBeLessThan(0)
    expect(fit.y).toBe(0)
    expect(fit.x + fit.width / 2).toBeCloseTo(195)
  })
  it('crops portrait video vertically in landscape', () => {
    const fit = coverTransform(480, 640, 724, 390)
    expect(fit.width).toBe(724)
    expect(fit.x).toBe(0)
    expect(fit.y).toBeLessThan(0)
    expect(fit.y + fit.height / 2).toBeCloseTo(195)
  })
})
