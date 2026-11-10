import './export.css'
import { useEffect, useRef, useState } from 'react'
import type { Entry } from '../archive/types'
import { Icon } from '../ui/Icon'
import { uiText } from '../ui/ui-text'
import { createOfflineHtml } from './export'
import downloadIcon from '../assets/mobile/download.svg'

export function ExportHtmlButton({ entry }: { entry: Entry }) {
  const controller = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => () => controller.current?.abort(), [])

  const download = async () => {
    if (controller.current) return
    const operation = new AbortController()
    controller.current = operation
    setBusy(true)
    setFailed(false)
    try {
      const html = await createOfflineHtml(entry, operation.signal)
      const url = URL.createObjectURL(html)
      const link = document.createElement('a')
      link.href = url
      link.download = `murmuration-${entry.metadata.id}.html`
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      if (!operation.signal.aborted) setFailed(true)
    } finally {
      if (!operation.signal.aborted) setBusy(false)
      controller.current = null
    }
  }

  return <div className="html-export">
    <button type="button" className="download-button" aria-label={uiText.exportHtml.download}
      aria-busy={busy} disabled={busy} onClick={() => void download()}>
      {busy ? <span className="spinner" aria-hidden="true" /> : <img src={downloadIcon} alt="" width="40" height="40" />}
    </button>
    <span role="status" className={failed ? 'export-error' : 'sr-only'}>
      {failed ? <><Icon name="warning" /><span className="sr-only">{uiText.exportHtml.failed}</span></> : busy ? uiText.exportHtml.preparing : ''}
    </span>
  </div>
}
