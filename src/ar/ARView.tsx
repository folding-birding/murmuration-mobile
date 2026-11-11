import { useState } from 'react'
import { CameraView, type CameraInput } from '../camera/CameraView'
import { useHandTracking } from '../camera/hand/useHandTracking'
import { useHandInteraction } from '../camera/hand/useHandInteraction'
import { HandTrackingControls } from '../camera/hand/HandTrackingControls'
import type { TrackingDelegate } from '../camera/hand/types'
import { useGravity } from '../camera/orientation/useGravity'
import { GravityControl } from '../camera/orientation/GravityControl'
import { DebugFrame } from '../camera/debug/DebugFrame'
import { InteractiveBird } from '../interactive-bird/InteractiveBird'

function ARScene({ video, mirrored, textureUrl, debug }: CameraInput & { textureUrl: string; debug: boolean }) {
  const [delegate, setDelegate] = useState<TrackingDelegate>('CPU')
  const [attempt, setAttempt] = useState(0)
  const tracking = useHandTracking(video, delegate, attempt)
  const interaction = useHandInteraction(tracking.source, video)
  const gravity = useGravity(mirrored)
  return <>
    <HandTrackingControls status={tracking.status} delegate={delegate}
      onToggle={() => setDelegate(value => value === 'GPU' ? 'CPU' : 'GPU')} onRetry={() => setAttempt(value => value + 1)} />
    <GravityControl status={gravity.status} onRequest={gravity.request} />
    {tracking.status === 'ready' && <InteractiveBird video={video} mirrored={mirrored} sample={interaction.hand} up={gravity.up} textureUrl={textureUrl} />}
    <DebugFrame enabled={debug} video={video} mirrored={mirrored} source={tracking.source} status={tracking.status}
      metrics={tracking.metrics} palm={interaction.palm} hand={interaction.hand} up={gravity.up} />
  </>
}

export function ARView({ textureUrl, debug = true }: { textureUrl: string; debug?: boolean }) {
  return <CameraView>{input => <ARScene {...input} textureUrl={textureUrl} debug={debug} />}</CameraView>
}
