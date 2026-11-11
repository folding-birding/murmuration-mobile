import { describe, expect, it } from 'vitest'
import { cameraUp } from '../src/camera/orientation/gravity'

describe('world up in camera coordinates', () => {
  const near = (actual: ReturnType<typeof cameraUp>, expected: number[]) => {
    ;[actual.x, actual.y, actual.z].forEach((value, index) => expect(value).toBeCloseTo(expected[index]))
  }
  it('handles an upright phone, face-up phone, and inverted phone', () => {
    near(cameraUp(90, 0, 0, false), [0, -1, 0])
    near(cameraUp(0, 0, 0, false), [0, 0, -1])
    near(cameraUp(180, 0, 0, false), [0, 0, 1])
    near(cameraUp(-90, 0, 180, false), [0, -1, 0])
  })
  it('keeps world up at the top of the image in both upright landscape directions', () => {
    near(cameraUp(0, -90, 90, false), [0, -1, 0])
    near(cameraUp(0, 90, 270, false), [0, -1, 0])
  })
  it('accounts for camera facing before display mirroring', () => {
    near(cameraUp(0, 0, 0, true), [0, 0, 1])
    near(cameraUp(0, -90, 0, true), [-1, 0, 0])
    near(cameraUp(90, 0, 0, true), [0, -1, 0])
  })
  it('produces unit vectors and consistent camera coordinates under device roll', () => {
    const rear = cameraUp(40, 25, 0, false)
    expect(Math.hypot(rear.x, rear.y, rear.z)).toBeCloseTo(1)
    const rotated = cameraUp(40, 25, 90, false)
    expect(rotated.x).toBeCloseTo(rear.y)
    expect(rotated.y).toBeCloseTo(-rear.x)
    expect(rotated.z).toBeCloseTo(rear.z)
  })
})
