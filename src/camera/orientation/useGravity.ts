import { useEffect, useRef, useState } from 'react'
import { cameraUp } from './gravity'
import type { Vector3 } from '../coordinates'

export type GravityStatus = 'waiting' | 'ready' | 'permission' | 'requesting' | 'denied' | 'unavailable'
type OrientationAPI = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

export function useGravity(frontCamera: boolean) {
  const up = useRef<Vector3 | null>(null)
  const [status, setStatus] = useState<GravityStatus>('waiting')
  const request = useRef<() => void>(() => {})
  useEffect(() => {
    let active = true, listening = false, pending = false, timer = 0
    let angles: { beta: number; gamma: number } | null = null
    const api = window.DeviceOrientationEvent as OrientationAPI | undefined
    up.current = null
    const project = () => {
      if (!angles) return
      const angle = screen.orientation?.angle ?? (typeof window.orientation === 'number' ? window.orientation : 0)
      up.current = cameraUp(angles.beta, angles.gamma, angle, frontCamera)
    }
    const receive = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return
      angles = { beta: event.beta, gamma: event.gamma }
      project()
      clearTimeout(timer)
      setStatus('ready')
    }
    const attach = () => {
      if (!listening) {
        listening = true
        window.addEventListener('deviceorientation', receive)
        screen.orientation?.addEventListener('change', project)
        window.addEventListener('orientationchange', project)
      }
    }
    const listen = () => {
      setStatus('waiting')
      attach()
      clearTimeout(timer)
      timer = window.setTimeout(() => { if (active) setStatus('unavailable') }, 4000)
    }
    request.current = () => {
      if (!api || pending) return
      if (!api.requestPermission) { listen(); return }
      pending = true
      setStatus('requesting')
      // Safari requires this call to originate directly from a user gesture.
      void api.requestPermission().then(result => {
        if (!active) return
        if (result === 'granted') listen()
        else { up.current = null; setStatus('denied') }
      }).catch(() => { if (active) { up.current = null; setStatus('denied') } }).finally(() => { pending = false })
    }
    if (!api) setStatus('unavailable')
    else if (api.requestPermission) { attach(); setStatus('permission') }
    else listen()
    return () => {
      active = false
      request.current = () => {}
      clearTimeout(timer)
      window.removeEventListener('deviceorientation', receive)
      screen.orientation?.removeEventListener('change', project)
      window.removeEventListener('orientationchange', project)
      up.current = null
    }
  }, [frontCamera])
  return { up, status, request: () => request.current() }
}
