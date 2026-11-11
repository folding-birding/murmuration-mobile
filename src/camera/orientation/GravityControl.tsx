import type { GravityStatus } from './useGravity'
import { Icon } from '../../ui/Icon'
import { uiText } from '../../ui/ui-text'
import './gravity.css'

export function GravityControl({ status, onRequest }: { status: GravityStatus; onRequest: () => void }) {
  if (status === 'ready') return null
  return <div className="gravity-status" role="status" data-state={status}>
    <button type="button" className="icon-button" aria-label={uiText.tracking.enableGravity} onClick={onRequest}><Icon name="gravity" /></button>
    <span className="sr-only">{uiText.tracking.gravity[status]}</span>
  </div>
}
