import { useCallback, useRef, useState } from 'react'
import { CameraView, type CameraInput } from '../camera/CameraView'
import { useHandTracking } from '../camera/hand/useHandTracking'
import { useHandInteraction } from '../camera/hand/useHandInteraction'
import { HandTrackingStatus, HandTrackingToggle } from '../camera/hand/HandTrackingControls'
import type { TrackingDelegate } from '../camera/hand/types'
import { useGravity } from '../camera/orientation/useGravity'
import { GravityControl } from '../camera/orientation/GravityControl'
import { DebugFrame } from '../camera/debug/DebugFrame'
import { useMultiTouchGesture } from '../ui/useMultiTouchGesture'
import { InteractiveBird } from '../interactive-bird/InteractiveBird'

function ARScene({ video, mirrored, textureUrl, debug }: CameraInput & { textureUrl: string; debug: boolean }) {
  const [delegate, setDelegate] = useState<TrackingDelegate>('CPU')
  const [attempt, setAttempt] = useState(0)
  const tracking = useHandTracking(video, delegate, attempt)
  const interaction = useHandInteraction(tracking.source, video)
  const gravity = useGravity(mirrored)
  return <>
    <HandTrackingStatus status={tracking.status} onRetry={() => setAttempt(value => value + 1)} />
    <GravityControl status={gravity.status} onRequest={gravity.request} />
    {tracking.status === 'ready' && <InteractiveBird video={video} mirrored={mirrored} sample={interaction.hand} up={gravity.up} textureUrl={textureUrl} />}
    <DebugFrame enabled={debug} video={video} mirrored={mirrored} source={tracking.source} status={tracking.status}
      metrics={tracking.metrics} palm={interaction.palm} hand={interaction.hand} up={gravity.up}>
      <HandTrackingToggle delegate={delegate} onToggle={() => setDelegate(value => value === 'GPU' ? 'CPU' : 'GPU')} />
    </DebugFrame>
  </>
}

export function ARView({ textureUrl, debug = false }: { textureUrl: string; debug?: boolean }) {
  const surface = useRef<HTMLDivElement>(null)
  const [debugVisible, setDebugVisible] = useState(debug)
  const toggleDebug = useCallback(() => setDebugVisible(value => !value), [])
  useMultiTouchGesture(surface, 4, toggleDebug)
  return <CameraView surfaceRef={surface}>{input => <ARScene {...input} textureUrl={textureUrl} debug={debugVisible} />}</CameraView>
}
