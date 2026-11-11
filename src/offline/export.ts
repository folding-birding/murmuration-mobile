import { validId } from '../archive/id'
import type { Entry } from '../archive/types'
import type { OfflineEntry } from './types'

interface Runtime { script: string; css: string; notices: string }

export function renderHtml(entry: Entry, runtime: Runtime, sourceUrl: string): string {
  if (!validId(entry.metadata.id)) throw new Error('Invalid bird ID')
  if (Object.values(entry.urls).some(url => !url.startsWith('data:'))) throw new Error('Offline media must be embedded')
  const source = new URL(sourceUrl)
  if (!['https:', 'http:'].includes(source.protocol)) throw new Error('Invalid online entry URL')
  source.searchParams.set('id', entry.metadata.id)
  const payload: OfflineEntry = { ...entry, sourceUrl: source.href }
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')
  const script = runtime.script.replace(/<\/script/gi, '<\\/script')
  const css = runtime.css.replace(/<\/style/gi, '<\\/style')
  const notices = JSON.stringify(runtime.notices).replace(/</g, '\\u003c')
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src data: blob:;">
<link rel="icon" href="data:,">
<title>Murmuration · ${entry.metadata.id}</title><style>${css}</style></head>
<body><div id="root"></div><script type="application/json" id="bird-data">${json}</script><script type="application/json" id="third-party-notices">${notices}</script><script>${script}</script></body></html>`
}

async function embed(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal, mode: 'cors', credentials: 'omit' })
  if (!response.ok) throw new Error(`Unable to embed media: HTTP ${response.status}`)
  const blob = await response.blob()
  if (!blob.size) throw new Error('Empty archive media')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function createOfflineHtml(entry: Entry, signal: AbortSignal): Promise<Blob> {
  const source = new URL(window.location.href)
  source.search = ''
  source.hash = ''
  const [response, texture, audio, qr] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}offline-runtime.json`, { signal, cache: 'no-cache' }),
    embed(entry.urls.texture, signal), embed(entry.urls.audio, signal), embed(entry.urls.qr, signal),
  ])
  if (!response.ok) throw new Error('Unable to load offline viewer')
  const runtime = await response.json() as Runtime
  if (typeof runtime.script !== 'string' || typeof runtime.css !== 'string' || typeof runtime.notices !== 'string') throw new Error('Invalid offline viewer')
  signal.throwIfAborted()
  return new Blob([renderHtml({ ...entry, urls: { texture, audio, qr } }, runtime, source.href)], { type: 'text/html;charset=utf-8' })
}
