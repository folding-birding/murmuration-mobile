import { useEffect, useState } from 'react'
import type { HandFrameSource } from '../hand/frameSource'
import { uiText } from '../../ui/ui-text'

export function HandednessDebug({ source }: { source: HandFrameSource }) {
  const [side, setSide] = useState<string | null>(null)
  useEffect(() => {
    let expiry: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = source.subscribe(({ frame, time, stableSide }) => {
      clearTimeout(expiry)
      const remaining = 350 - (performance.now() - time)
      const recognized = frame.landmarks.length > 0 && remaining > 0 && stableSide !== null
      setSide(recognized ? stableSide : null)
      if (recognized) expiry = setTimeout(() => setSide(null), remaining)
    })
    return () => { unsubscribe(); clearTimeout(expiry) }
  }, [source])
  return <div>{uiText.tracking.hand} <span data-metric="handedness">{side ?? '—'}</span></div>
}
