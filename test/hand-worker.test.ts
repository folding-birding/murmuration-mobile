import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrackingRequest } from '../src/camera/hand/types'

const create = vi.hoisted(() => vi.fn())
vi.mock('@mediapipe/tasks-vision', () => ({ HandLandmarker: { createFromOptions: create } }))

let scope: { location: { href: string }; postMessage: ReturnType<typeof vi.fn>; onmessage?: (event: { data: TrackingRequest }) => Promise<void> }
const detect = vi.fn()

beforeEach(async () => {
  vi.resetModules()
  create.mockReset()
  detect.mockReset()
  scope = { location: { href: 'https://example.org/assets/worker.js' }, postMessage: vi.fn() }
  vi.stubGlobal('self', scope)
  await import('../src/camera/hand/tracking.worker')
})
afterEach(() => vi.unstubAllGlobals())

describe('hand tracking delegate', () => {
  it('keeps GPU when initialization succeeds', async () => {
    create.mockResolvedValue({ detectForVideo: detect })
    await scope.onmessage!({ data: { type: 'init', delegate: 'GPU' } })
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][1].baseOptions.delegate).toBe('GPU')
    expect(scope.postMessage).toHaveBeenLastCalledWith({ type: 'ready', delegate: 'GPU' })
  })
  it('initializes CPU directly when selected', async () => {
    create.mockResolvedValueOnce({ detectForVideo: detect })
    await scope.onmessage!({ data: { type: 'init', delegate: 'CPU' } })
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0][1].baseOptions.delegate).toBe('CPU')
    expect(scope.postMessage).toHaveBeenLastCalledWith({ type: 'ready', delegate: 'CPU' })
    const frame = { close: vi.fn() }
    detect.mockReturnValue({ landmarks: [], worldLandmarks: [], handedness: [] })
    await scope.onmessage!({ data: { type: 'frame', frame: frame as unknown as ImageBitmap, timestamp: 100 } })
    expect(scope.postMessage).toHaveBeenLastCalledWith({ type: 'result', landmarks: [], worldLandmarks: [], handedness: [], inferenceMs: expect.any(Number) })
    expect(frame.close).toHaveBeenCalledOnce()
  })
  it('reports the selected delegate failure without silently switching', async () => {
    create.mockRejectedValue(new Error('Model unavailable'))
    await scope.onmessage!({ data: { type: 'init', delegate: 'GPU' } })
    expect(create).toHaveBeenCalledTimes(1)
    expect(scope.postMessage).toHaveBeenLastCalledWith({ type: 'error' })
  })
})
