import { useEffect, useRef, useState, type RefObject } from 'react'
import type { mountBirdScene } from '../viewer/birdScene'
import type { Vector3 } from '../camera/coordinates'
import type { HandSample } from '../camera/hand/gesture'
import { birdTarget, departureOffset } from './placement'
import { flightCorner, follow, BirdFlight } from './flight'
import { interactiveBirdSettings as settings } from './settings'
import { Icon } from '../ui/Icon'
import { uiText } from '../ui/ui-text'
import './interactive-bird.css'

export function InteractiveBird({ video, mirrored, sample, up, textureUrl }: {
  video: HTMLVideoElement; mirrored: boolean; sample: RefObject<HandSample>
  up: RefObject<Vector3 | null>; textureUrl: string
}) {
  const layer = useRef<HTMLDivElement>(null)
  const bird = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = bird.current!, surface = canvas.current!, viewport = layer.current!
    const flight = new BirdFlight()
    let mounted: ReturnType<typeof mountBirdScene> | undefined
    let cancelled = false, loadStarted = false, ready = false
    let animation = 0, previous = 0
    let target: ReturnType<typeof birdTarget> = null
    let position = { x: 0, y: 0 }, departure = { x: 0, y: 0 }
    let lastUp: Vector3 | null = null
    let departureDirection = { x: 0, y: 0 }
    let smoothed: NonNullable<ReturnType<typeof birdTarget>> = { x: 0, y: 0, size: settings.canvasPixels }
    setFailed(false)
    element.dataset.model = 'idle'
    element.dataset.state = 'hidden'
    element.style.visibility = 'hidden'
    const fail = () => {
      if (cancelled) return
      ready = false
      mounted?.dispose()
      element.dataset.model = 'failed'
      element.style.visibility = 'hidden'
      setFailed(true)
    }
    const contextLost = (event: Event) => { event.preventDefault(); fail() }
    surface.addEventListener('webglcontextlost', contextLost)
    const load = () => {
      loadStarted = true
      element.dataset.model = 'loading'
      void import('../viewer/birdScene').then(({ mountBirdScene }) => {
        if (cancelled) return
        mounted = mountBirdScene(surface, textureUrl, () => {
          if (cancelled) return
          ready = true
          element.dataset.model = 'ready'
        }, fail)
        mounted.setActive(false)
      }).catch(fail)
    }
    const draw = (time: number) => {
      if (cancelled) return
      animation = requestAnimationFrame(draw)
      const dt = previous ? Math.min((time - previous) / 1000, 0.1) : 0
      previous = time
      if (up.current) lastUp = { ...up.current }
      const fresh = time - sample.current.time < settings.gestureGraceMs
      const hand = fresh ? sample.current.hand : null
      const width = viewport.clientWidth, height = viewport.clientHeight
      if (hand && up.current && video.videoWidth && video.videoHeight) {
        const next = birdTarget(hand, up.current, video.videoWidth, video.videoHeight, width, height, mirrored)
        if (next) target = next
      }
      if (!loadStarted && hand?.open && up.current && target) load()
      const oldPhase = flight.phase
      const phase = flight.step(time, sample.current, ready && !!up.current && !!target)
      element.dataset.state = phase
      element.dataset.side = flight.side
      const visible = ready && phase !== 'hidden'
      element.style.visibility = visible ? 'visible' : 'hidden'
      mounted?.setActive(visible)
      if (!visible || !target) return
      if (phase === 'arriving' && oldPhase === 'hidden') {
        smoothed = { ...target }
        mounted?.setYaw(flight.side === 'Right' ? -Math.PI / 5 : Math.PI / 5)
      }
      if (phase !== 'leaving') smoothed = { x: follow(smoothed.x, target.x, dt), y: follow(smoothed.y, target.y, dt), size: follow(smoothed.size, target.size, dt) }
      const progress = Math.min(1, (time - flight.phaseStarted) / settings.travelMs)
      element.style.opacity = '1'
      if (phase === 'leaving') {
        if (oldPhase !== 'leaving') {
          departure = { ...position }
          departureDirection = departureOffset(lastUp, width, height, smoothed.size, mirrored)
        }
        const t = progress * progress
        position = { x: departure.x + departureDirection.x * t, y: departure.y + departureDirection.y * t }
        // Fade at the end even when gravity points mostly along the camera depth axis.
        const fade = Math.max(0, (progress - 0.65) / 0.35)
        element.style.opacity = String(1 - fade * fade * (3 - 2 * fade))
      } else if (phase === 'arriving') {
        const corner = flightCorner(flight.side, width, smoothed.size)
        const t = 1 - (1 - progress) ** 3
        position = { x: corner.x + (smoothed.x - corner.x) * t,
          y: corner.y + (smoothed.y - corner.y) * t - Math.sin(progress * Math.PI) * smoothed.size * 0.3 }
      } else position = { x: smoothed.x, y: smoothed.y }
      element.style.transform = `translate(${position.x - smoothed.size / 2}px, ${position.y - smoothed.size / 2}px) scale(${smoothed.size / settings.canvasPixels})`
    }
    animation = requestAnimationFrame(draw)
    return () => {
      cancelled = true
      cancelAnimationFrame(animation)
      surface.removeEventListener('webglcontextlost', contextLost)
      mounted?.dispose()
    }
  }, [video, mirrored, sample, up, textureUrl, attempt])

  return <>
    <div ref={layer} className="interactive-bird-layer" aria-hidden="true">
      <div ref={bird} className="interactive-bird" style={{ width: settings.canvasPixels, height: settings.canvasPixels }}><canvas ref={canvas} key={attempt} /></div>
    </div>
    {failed && <button type="button" className="icon-button interactive-bird-error" aria-label={uiText.viewer.retry} onClick={() => setAttempt(value => value + 1)}><Icon name="retry" /></button>}
  </>
}
