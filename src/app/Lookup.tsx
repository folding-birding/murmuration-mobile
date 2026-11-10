import { useState, type FormEvent } from 'react'
import { validId } from '../archive/id'
import { uiText as text } from '../ui/ui-text'
import { Icon } from '../ui/Icon'
import lookupLogo from '../assets/mobile/logo-white.svg'
import submitIcon from '../assets/mobile/submit.svg'
import './lookup.css'

export function Lookup({ entriesPath }: { entriesPath: string }) {
  const [id, setId] = useState('')
  const [error, setError] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!validId(id.trim())) { setError(true); return }
    window.location.assign(`${entriesPath}?id=${encodeURIComponent(id.trim())}`)
  }
  return <section className="lookup">
    <h1 className="sr-only">{text.lookupTitle}</h1>
    <div className="lookup-symbol"><img src={lookupLogo} alt="" width="160" height="160" /></div>
    <form onSubmit={submit} noValidate>
      <label htmlFor="bird-id" className="sr-only">{text.idLabel}</label>
      <div className="lookup-input" data-invalid={error}>
        <input id="bird-id" name="id" type="text" inputMode="numeric" autoComplete="off"
          maxLength={14} placeholder={text.idPlaceholder} value={id}
          aria-invalid={error} aria-describedby={error ? 'id-error id-hint' : 'id-hint'}
          onChange={event => { setId(event.target.value); setError(false) }} />
        <button type="submit" className="lookup-submit" aria-label={text.find}><img src={submitIcon} alt="" width="30" height="30" /></button>
      </div>
      <p id="id-hint" className="sr-only">{text.idHint}</p>
      {error && <p id="id-error" role="alert" className="error"><Icon name="warning" /><span className="sr-only">{text.invalidId}</span></p>}
    </form>
  </section>
}
