import { useEffect, useState } from 'react'
import { EntryNotFound, loadConfiguredEntry } from '../archive/client'
import { validId } from '../archive/id'
import type { Entry } from '../archive/types'
import { EntryViewer } from '../entry/EntryViewer'
import { ARView } from '../ar/ARView'
import { ExportHtmlButton } from '../offline/ExportHtmlButton'
import { uiText as text } from '../ui/ui-text'
import { Icon } from '../ui/Icon'
import { Lookup } from './Lookup'

const entriesPath = `${import.meta.env.BASE_URL}entries/`
const query = new URLSearchParams(window.location.search)
const requestedId = query.get('id')
const invalidQuery = query.has('id') && (query.getAll('id').length !== 1 || !validId(requestedId || ''))

export default function App() {
  const [entry, setEntry] = useState<Entry>()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (invalidQuery) { window.location.replace(entriesPath); return }
    if (!requestedId) return
    const controller = new AbortController()
    setFailed(false)
    void loadConfiguredEntry(requestedId, controller.signal).then(setEntry).catch(error => {
      if (controller.signal.aborted) return
      if (error instanceof EntryNotFound) window.location.replace(entriesPath)
      else setFailed(true)
    })
    return () => controller.abort()
  }, [attempt])
  return <div className="page">
    <main>{!requestedId && !invalidQuery ? <Lookup entriesPath={entriesPath} /> : entry ? <EntryViewer entry={entry} homeHref={entriesPath} extraActions={<ExportHtmlButton entry={entry} />} cameraView={<ARView textureUrl={entry.urls.texture} />} />
      : <section className="status-panel" aria-live="polite">
        {failed ? <Icon name="warning" /> : <span className="spinner" aria-hidden="true" />}
        <h1 className="sr-only">{failed ? text.unavailable : text.loading}</h1>
        {failed && <button className="icon-button" aria-label={text.retry} onClick={() => setAttempt(value => value + 1)}><Icon name="retry" /></button>}
      </section>}
    </main>
  </div>
}
