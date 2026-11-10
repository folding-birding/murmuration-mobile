import { useState } from 'react'
import type { Entry } from '../archive/types'
import { uiText as text } from '../ui/ui-text'
import { Icon } from '../ui/Icon'
import logo from '../assets/mobile/logo-ink.svg'
import './entry.css'

interface EntryViewerProps {
  entry: Entry
  homeHref?: string
}

export function EntryViewer({ entry, homeHref }: EntryViewerProps) {
  const { metadata, urls } = entry
  const [qrError, setQrError] = useState(false)
  const brand = <img src={logo} alt="" width="40" height="40" />

  return <article className="bird-entry" aria-label={text.resultTitle}>
    <h1 className="sr-only">{metadata.id}</h1>
    <header className="entry-header">
      {homeHref ? <a className="brand-mark" href={homeHref} aria-label={text.home}>{brand}</a> : <span className="brand-mark">{brand}</span>}
    </header>
    <div className="entry-viewport">
      <div className="entry-track">
        <section id="bird-qr" className="entry-panel" aria-label={text.qrAlt}>
          <div className="bird-identity">
            <div className="bird-qr">
              {qrError ? <p role="status"><Icon name="warning" /><span className="sr-only">{text.qrError}</span></p>
                : <img src={urls.qr} alt={text.qrAlt} width="205" height="205" draggable={false} onError={() => setQrError(true)} />}
            </div>
            <p className="bird-id">{metadata.id}</p>
          </div>
        </section>
      </div>
    </div>
    <footer className="entry-footer" />
  </article>
}
