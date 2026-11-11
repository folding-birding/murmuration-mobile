import { useState } from 'react'
import { CameraView, type CameraInput } from './CameraView'
import { useHandTracking } from './hand/useHandTracking'
import { HandTrackingControls } from './hand/HandTrackingControls'
import type { TrackingDelegate } from './hand/types'
import { DebugFrame } from './debug/DebugFrame'

function TrackingScene({ video, mirrored }: CameraInput) {
  const [delegate, setDelegate] = useState<TrackingDelegate>('CPU')
  const [attempt, setAttempt] = useState(0)
  const tracking = useHandTracking(video, delegate, attempt)
  return <>
    <HandTrackingControls status={tracking.status} delegate={delegate}
      onToggle={() => setDelegate(value => value === 'GPU' ? 'CPU' : 'GPU')} onRetry={() => setAttempt(value => value + 1)} />
    <DebugFrame video={video} mirrored={mirrored} source={tracking.source} status={tracking.status}
      metrics={tracking.metrics} />
  </>
}

export function HandTrackingCamera() {
  return <CameraView>{input => <TrackingScene {...input} />}</CameraView>
}
