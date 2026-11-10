import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import { uiText } from '../ui/ui-text'
import './camera.css'

type CameraStatus = 'loading' | 'ready' | 'paused' | 'denied' | 'missing' | 'failed' | 'unsupported'

export interface CameraInput { video: HTMLVideoElement; mirrored: boolean }

export function CameraView({ children }: { children?: (input: CameraInput) => ReactNode }) {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CameraStatus>('loading')
  const [mirrored, setMirrored] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = video.current
    if (!element) return
    let cancelled = false
    let interrupted = false
    let stream: MediaStream | undefined
    const stop = () => {
      stream?.getTracks().forEach(track => {
        track.removeEventListener('ended', pause)
        track.stop()
      })
      stream = undefined
      element.pause()
      element.srcObject = null
    }
    function pause() {
      interrupted = true
      stop()
      if (!cancelled) setStatus('paused')
    }
    const visibilityChanged = () => {
      if (document.hidden) pause()
    }

    const start = async () => {
      setMirrored(false)
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported')
        return
      }
      if (document.hidden) {
        pause()
        return
      }
      setStatus('loading')
      try {
        const captured = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled || interrupted) {
          captured.getTracks().forEach(track => track.stop())
          return
        }
        stream = captured
        const track = stream.getVideoTracks()[0]
        if (!track || track.readyState !== 'live') throw new Error('Camera is unavailable')
        setMirrored(track.getSettings().facingMode === 'user')
        track.addEventListener('ended', pause)
        element.srcObject = stream
        await element.play()
        if (!cancelled && !interrupted) setStatus('ready')
      } catch (error) {
        if (cancelled || interrupted) return
        stop()
        const name = error instanceof DOMException ? error.name : ''
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
          : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'missing' : 'failed')
      }
    }

    document.addEventListener('visibilitychange', visibilityChanged)
    window.addEventListener('pagehide', pause)
    void start()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', visibilityChanged)
      window.removeEventListener('pagehide', pause)
      stop()
    }
  }, [attempt])

  return <div className="camera-view" data-state={status}>
    <video ref={video} className="camera-video" data-mirrored={mirrored} autoPlay muted playsInline aria-hidden="true" />
    {status === 'ready' && video.current && children?.({ video: video.current, mirrored })}
    {status !== 'ready' && <div className="camera-message" role="status">
      {status === 'loading' ? <span className="spinner" aria-hidden="true" /> : <Icon name="warning" />}
      <span className="sr-only">{uiText.camera[status]}</span>
      {status !== 'loading' && status !== 'unsupported' && <button type="button" className="icon-button"
        aria-label={uiText.camera.retry} onClick={() => setAttempt(value => value + 1)}>
        <Icon name="retry" />
      </button>}
    </div>}
  </div>
}
