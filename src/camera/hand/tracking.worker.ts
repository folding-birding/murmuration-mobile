import { HandLandmarker } from '@mediapipe/tasks-vision'
import loaderUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url'
import wasmUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url'
import modelUrl from '../../assets/models/hand_landmarker.task?url'
import type { TrackingDelegate, TrackingRequest, TrackingResponse } from './types'

let detector: HandLandmarker | undefined
const send = (message: TrackingResponse) => self.postMessage(message)
const createDetector = (delegate: TrackingDelegate) => HandLandmarker.createFromOptions({
  wasmLoaderPath: new URL(loaderUrl, self.location.href).href,
  wasmBinaryPath: new URL(wasmUrl, self.location.href).href,
}, {
  baseOptions: { modelAssetPath: new URL(modelUrl, self.location.href).href, delegate },
  runningMode: 'VIDEO',
  numHands: 1,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
})

self.onmessage = async ({ data }: MessageEvent<TrackingRequest>) => {
  try {
    if (data.type === 'init') {
      const delegate = data.delegate
      detector = await createDetector(delegate)
      send({ type: 'ready', delegate })
    } else {
      if (!detector) throw new Error('Hand tracker is not ready')
      const started = performance.now()
      const { landmarks, worldLandmarks, handedness } = detector.detectForVideo(data.frame, data.timestamp)
      send({ type: 'result', landmarks, worldLandmarks, handedness, inferenceMs: performance.now() - started })
    }
  } catch {
    send({ type: 'error' })
  } finally {
    if (data.type === 'frame') data.frame.close()
  }
}
