import { useState, type ReactNode } from 'react'
import type { Entry } from '../archive/types'
import { BirdModelViewer } from '../viewer/BirdModelViewer'
import { uiText as text } from '../ui/ui-text'
import { Icon } from '../ui/Icon'
import { useBirdsong } from './useBirdsong'
import { useSwipeNavigation } from './useSwipeNavigation'
import logo from '../assets/mobile/logo-ink.svg'
import activeDot from '../assets/mobile/dot-active.svg'
import inactiveDot from '../assets/mobile/dot-inactive.svg'
import './entry.css'

const views = [
  { panelId: 'bird-qr', label: text.slides.qr },
  { panelId: 'bird-model', label: text.slides.model },
] as const

interface EntryViewerProps {
  entry: Entry
  extraActions?: ReactNode
  homeHref?: string
}

export function EntryViewer({ entry, extraActions, homeHref }: EntryViewerProps) {
  const { metadata, urls } = entry
  const sound = useBirdsong()
  const [slide, setSlide] = useState(0)
  const [qrError, setQrError] = useState(false)
  const lastSlide = views.length - 1
  const navigate = (index: number) => {
    setSlide(Math.max(0, Math.min(lastSlide, index)))
    sound.pause()
  }
  const swipeHandlers = useSwipeNavigation(direction => navigate(slide + direction))
  const brand = <img src={logo} alt="" width="40" height="40" />

  return <article className="bird-entry" data-slide={slide} aria-label={text.resultTitle} {...swipeHandlers}>
    <h1 className="sr-only">{metadata.id}</h1>
    <header className="entry-header">
      {homeHref ? <a className="brand-mark" href={homeHref} aria-label={text.home}>{brand}</a> : <span className="brand-mark">{brand}</span>}
      {extraActions}
    </header>
    <div className="entry-viewport">
      <div className="entry-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
        <section id={views[0].panelId} className="entry-panel" role="tabpanel" aria-labelledby="bird-tab-0" aria-hidden={slide !== 0} inert={slide !== 0}>
          <div className="bird-identity">
            <div className="bird-qr">
              {qrError ? <p role="status"><Icon name="warning" /><span className="sr-only">{text.qrError}</span></p>
                : <img src={urls.qr} alt={text.qrAlt} width="205" height="205" draggable={false} onError={() => setQrError(true)} />}
            </div>
            <p className="bird-id">{metadata.id}</p>
          </div>
        </section>
        <section id={views[1].panelId} className="entry-panel" role="tabpanel" aria-labelledby="bird-tab-1" aria-hidden={slide !== 1} inert={slide !== 1}>
          {slide === 1 && <BirdModelViewer textureUrl={urls.texture} onPlay={sound.play} />}
          {sound.error && <p role="alert" className="audio-error"><Icon name="warning" /><span className="sr-only">{text.audioError}</span></p>}
        </section>
      </div>
    </div>
    <footer className="entry-footer">
      <div role="tablist" aria-label={text.slides.navigation} className="slide-tabs">
        {views.map((view, index) => <button key={view.panelId} id={`bird-tab-${index}`} type="button" role="tab"
          aria-label={view.label} aria-selected={slide === index} aria-controls={view.panelId}
          tabIndex={slide === index ? 0 : -1} onClick={() => navigate(index)}
          onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? Math.min(lastSlide, index + 1) : event.key === 'ArrowLeft' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? lastSlide : null
            if (next === null) return
            event.preventDefault()
            navigate(next)
            document.getElementById(`bird-tab-${next}`)?.focus()
          }}>
          <img src={index === slide ? activeDot : inactiveDot} alt="" width="12" height="12" draggable={false} />
        </button>)}
      </div>
    </footer>
    <audio ref={sound.ref} src={urls.audio} preload="metadata" aria-label={text.audioLabel} onError={sound.onError} />
  </article>
}
