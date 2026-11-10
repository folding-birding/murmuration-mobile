import { createRoot } from 'react-dom/client'
import { EntryViewer } from '../entry/EntryViewer'
import type { Entry } from '../archive/types'
import { applyUiVariables } from '../ui/ui-variable'
import '../ui/global.css'

const entry = JSON.parse(document.getElementById('bird-data')!.textContent!) as Entry
applyUiVariables()
createRoot(document.getElementById('root')!).render(
  <div className="page">
    <main><EntryViewer entry={entry} /></main>
  </div>,
)
