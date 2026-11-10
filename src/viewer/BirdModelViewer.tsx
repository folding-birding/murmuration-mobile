import './viewer.css'
import { uiText } from '../ui/ui-text'
import { Icon } from '../ui/Icon'
import { useEffect, useRef, useState } from 'react'
import type { mountBirdScene } from './birdScene'

interface BirdModelViewerProps {
  textureUrl: string
  onPlay: () => void
}

const INITIAL_YAW = -Math.PI / 5

export function BirdModelViewer({ textureUrl, onPlay }: BirdModelViewerProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ReturnType<typeof mountBirdScene> | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [yaw, setYaw] = useState(INITIAL_YAW)
  const drag = useRef<{ id: number; x: number; y: number; yaw: number; width: number; moved: boolean; time: number } | null>(null)
  const tap = useRef<{ x: number; y: number; time: number; type: string } | null>(null)

  useEffect(() => {
    const element = canvas.current!
    let cancelled = false
    let mounted: ReturnType<typeof mountBirdScene> | undefined
    setStatus('loading')
    setYaw(INITIAL_YAW)
    drag.current = null
    tap.current = null
    function contextLost(event: Event) {
      event.preventDefault()
      if (!cancelled) { mounted?.dispose(); setStatus('failed') }
    }
    element.addEventListener('webglcontextlost', contextLost)
    // Keep Three.js and the FBX out of the initial lookup screen bundle.
    void import('./birdScene').then(({ mountBirdScene }) => {
      if (cancelled) return
      mounted = mountBirdScene(element, textureUrl, () => setStatus('ready'), () => setStatus('failed'))
      mounted.setYaw(INITIAL_YAW)
      scene.current = mounted
    }).catch(() => { if (!cancelled) setStatus('failed') })
    return () => {
      cancelled = true
      element.removeEventListener('webglcontextlost', contextLost)
      mounted?.dispose()
      scene.current = null
    }
  }, [textureUrl, attempt])

  const rotate = (angle: number) => {
    const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle))
    setYaw(wrapped)
    scene.current?.setYaw(wrapped)
  }
  const cancelGesture = () => { drag.current = null; tap.current = null }

  return (
    <div className="bird-preview" role="group" tabIndex={0}
      aria-label={uiText.viewer.accessibility}
      aria-busy={status === 'loading'} data-state={status} data-yaw={yaw} data-animation={status === 'ready' ? 'hover' : undefined}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) { cancelGesture(); return }
        if (status !== 'ready') return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw,
          width: event.currentTarget.getBoundingClientRect().width, moved: false, time: event.timeStamp }
      }}
      onPointerMove={(event) => {
        const start = drag.current
        if (!start || start.id !== event.pointerId) return
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) start.moved = true
        if (start.moved) {
          tap.current = null
          rotate(start.yaw + (event.clientX - start.x) / start.width * Math.PI * 2)
        }
      }}
      onPointerUp={(event) => {
        const start = drag.current
        if (!start || start.id !== event.pointerId) return
        drag.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        if (start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 || event.timeStamp - start.time > 350) {
          tap.current = null
          return
        }
        const last = tap.current
        if (last && last.type === event.pointerType && event.timeStamp - last.time < 350 && Math.hypot(event.clientX - last.x, event.clientY - last.y) < 24) {
          tap.current = null
          onPlay()
        } else tap.current = { x: event.clientX, y: event.clientY, time: event.timeStamp, type: event.pointerType }
      }}
      onPointerCancel={cancelGesture}
      onLostPointerCapture={() => { if (drag.current) cancelGesture() }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (['ArrowLeft', 'ArrowRight', 'Home', 'Enter', ' '].includes(event.key)) event.preventDefault()
        if (event.key === 'ArrowLeft') rotate(yaw - Math.PI / 12)
        if (event.key === 'ArrowRight') rotate(yaw + Math.PI / 12)
        if (event.key === 'Home') rotate(INITIAL_YAW)
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) onPlay()
      }}>
      <canvas ref={canvas} key={`${textureUrl}:${attempt}`} className="bird-model-canvas" aria-hidden="true" />
      {status === 'loading' && <div className="bird-model-message" role="status"><span className="spinner" aria-hidden="true" /><span className="sr-only">{uiText.viewer.loading}</span></div>}
      {status === 'failed' && <div className="bird-model-message" role="status">
        <Icon name="warning" /><span className="sr-only">{uiText.viewer.unavailable}</span>
        <button type="button" className="icon-button" aria-label={uiText.viewer.retry} onClick={() => setAttempt((value) => value + 1)}><Icon name="retry" /></button>
      </div>}
    </div>
  )
}
