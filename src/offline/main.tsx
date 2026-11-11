import { createRoot } from 'react-dom/client'
import { EntryViewer } from '../entry/EntryViewer'
import { OnlineARLink } from './OnlineARLink'
import type { OfflineEntry } from './types'
import { applyUiVariables } from '../ui/ui-variable'
import '../ui/global.css'

const entry = JSON.parse(document.getElementById('bird-data')!.textContent!) as OfflineEntry
applyUiVariables()
createRoot(document.getElementById('root')!).render(
  <div className="page">
    <main><EntryViewer entry={entry} cameraView={<OnlineARLink href={entry.sourceUrl} />} /></main>
  </div>,
)
