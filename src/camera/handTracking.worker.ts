import { HandLandmarker } from '@mediapipe/tasks-vision'
import loaderUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url'
import wasmUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url'
import modelUrl from '../assets/models/hand_landmarker.task?url'
import type { TrackingRequest, TrackingResponse } from './handTracking'

let detector: HandLandmarker | undefined
const send = (message: TrackingResponse) => self.postMessage(message)

self.onmessage = async ({ data }: MessageEvent<TrackingRequest>) => {
  try {
    if (data.type === 'init') {
      detector = await HandLandmarker.createFromOptions({
        wasmLoaderPath: new URL(loaderUrl, self.location.href).href,
        wasmBinaryPath: new URL(wasmUrl, self.location.href).href,
      }, {
        baseOptions: { modelAssetPath: new URL(modelUrl, self.location.href).href, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      send({ type: 'ready' })
    } else {
      if (!detector) throw new Error('Hand tracker is not ready')
      const { landmarks, worldLandmarks } = detector.detectForVideo(data.frame, data.timestamp)
      send({ type: 'result', landmarks, worldLandmarks })
    }
  } catch {
    send({ type: 'error' })
  } finally {
    if (data.type === 'frame') data.frame.close()
  }
}
