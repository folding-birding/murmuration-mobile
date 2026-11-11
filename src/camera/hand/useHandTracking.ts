import { useEffect, useState } from 'react'
import { startHandTracking } from './tracking'
import { createHandFrameSource, type HandFrameSource } from './frameSource'
import type { TrackingDelegate, TrackingMetrics, TrackingStatus } from './types'

export function useHandTracking(video: HTMLVideoElement, delegate: TrackingDelegate, attempt: number) {
  const [source] = useState(createHandFrameSource)
  const [status, setStatus] = useState<TrackingStatus>('loading')
  const [metrics, setMetrics] = useState<TrackingMetrics | null>(null)
  useEffect(() => {
    source.clear()
    setStatus('loading')
    setMetrics(null)
    let stop: (() => void) | undefined
    try {
      stop = startHandTracking(video, next => {
        if (next === 'failed') source.clear()
        setStatus(next)
      }, setMetrics, delegate, source.publish)
    } catch {
      setStatus('failed')
    }
    return () => { stop?.(); source.clear() }
  }, [video, delegate, attempt, source])
  return { source: source as HandFrameSource, status, metrics }
}
