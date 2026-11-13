import { useId, useState } from 'react'
import type { GravityStatus } from './useGravity'
import { uiText } from '../../ui/ui-text'
import './gravity.css'

export function GravityControl({ status, onRequest }: { status: GravityStatus; onRequest: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  if (status === 'ready') return null
  const needsPermission = status === 'permission' || status === 'requesting' || status === 'denied'
  const message = uiText.tracking.gravity[status]
  if (!needsPermission || dismissed) return <span className="gravity-status sr-only" role="status" data-state={status}>{message}</span>
  const pending = status === 'requesting'
  const text = uiText.motionPermission
  return <div className="motion-permission-backdrop">
    <section className="motion-permission" role="dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      aria-busy={pending} data-state={status} onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => { if (event.key === 'Escape' && !pending) { event.stopPropagation(); setDismissed(true) } }}>
      <h2 id={titleId}>{text.title}</h2>
      <span id={descriptionId} className="sr-only" role="status">{message}</span>
      <div className="motion-permission-actions">
        <button type="button" disabled={pending} onClick={() => setDismissed(true)}>{text.decline}</button>
        <button type="button" className="motion-permission-allow" disabled={pending} onClick={onRequest}>{text.allow}</button>
      </div>
    </section>
  </div>
}
