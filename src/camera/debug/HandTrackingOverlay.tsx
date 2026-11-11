import { useEffect, useRef } from 'react'
import type { HandFrameSource } from '../hand/frameSource'
import type { TrackingMetrics, TrackingStatus } from '../hand/types'
import { drawHands } from './drawHands'
import { TrackingDebug } from './TrackingDebug'
import './debug.css'

export function HandTrackingOverlay({ video, mirrored, source, status, metrics }: {
  video: HTMLVideoElement; mirrored: boolean; source: HandFrameSource
  status: TrackingStatus; metrics: TrackingMetrics | null
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current!
    const draw = () => {
      element.dataset.hands = String(source.current.frame.landmarks.length)
      drawHands(element, video, source.current.frame)
    }
    const unsubscribe = source.subscribe(draw)
    const resize = new ResizeObserver(draw)
    resize.observe(element)
    return () => {
      unsubscribe()
      resize.disconnect()
      element.width = element.width
    }
  }, [source, video])
  return <>
    <canvas ref={canvas} className="hand-overlay" data-mirrored={mirrored} data-state={status} aria-hidden="true" />
    <TrackingDebug video={video} status={status} metrics={metrics} />
  </>
}
