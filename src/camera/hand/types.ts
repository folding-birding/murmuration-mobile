import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'

export type HandSide = 'Left' | 'Right'

export type HandFrame = Pick<HandLandmarkerResult, 'landmarks' | 'worldLandmarks' | 'handedness'>

export interface TrackingMetrics {
  cameraWidth: number
  cameraHeight: number
  inputWidth: number
  inputHeight: number
  delegate: TrackingDelegate
  inferenceMs: number | null
  totalMs: number | null
}

export type TrackingDelegate = 'GPU' | 'CPU'
export type TrackingStatus = 'loading' | 'ready' | 'failed'
export type TrackingRequest = { type: 'init'; delegate: TrackingDelegate } | { type: 'frame'; frame: ImageBitmap; timestamp: number }
export type TrackingResponse = { type: 'ready'; delegate: TrackingDelegate } | { type: 'error' } | ({ type: 'result'; inferenceMs: number } & HandFrame)
