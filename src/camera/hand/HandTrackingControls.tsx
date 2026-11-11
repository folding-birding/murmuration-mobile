import type { TrackingDelegate, TrackingStatus } from './types'
import { Icon } from '../../ui/Icon'
import { uiText } from '../../ui/ui-text'
import './hand.css'

export function HandTrackingToggle({ delegate, onToggle }: {
  delegate: TrackingDelegate; onToggle: () => void
}) {
  return <button type="button" className="tracking-toggle" aria-label={uiText.tracking.gpuToggle}
    aria-pressed={delegate === 'GPU'} onClick={onToggle}>{delegate}</button>
}

export function HandTrackingStatus({ status, onRetry }: {
  status: TrackingStatus; onRetry: () => void
}) {
  if (status === 'ready') return null
  return <div className="tracking-status" role="status">
    {status === 'loading' ? <span className="spinner" aria-hidden="true" /> : <button type="button" className="icon-button"
      aria-label={uiText.tracking.retry} onClick={onRetry}><Icon name="retry" /></button>}
    <span className="sr-only">{uiText.tracking[status]}</span>
  </div>
}
