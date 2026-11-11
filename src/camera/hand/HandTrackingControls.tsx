import type { TrackingDelegate, TrackingStatus } from './types'
import { Icon } from '../../ui/Icon'
import { uiText } from '../../ui/ui-text'
import './hand.css'

export function HandTrackingControls({ status, delegate, onToggle, onRetry }: {
  status: TrackingStatus; delegate: TrackingDelegate; onToggle: () => void; onRetry: () => void
}) {
  return <>
    <button type="button" className="tracking-toggle" aria-label={uiText.tracking.gpuToggle}
      aria-pressed={delegate === 'GPU'} onClick={onToggle}>{delegate}</button>
    {status !== 'ready' && <div className="tracking-status" role="status">
      {status === 'loading' ? <span className="spinner" aria-hidden="true" /> : <button type="button" className="icon-button"
        aria-label={uiText.tracking.retry} onClick={onRetry}><Icon name="retry" /></button>}
      <span className="sr-only">{uiText.tracking[status]}</span>
    </div>}
  </>
}
