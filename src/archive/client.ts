import type { BirdColor, Entry, EntryMetadata } from './types'
import { validId } from './id'

export class EntryNotFound extends Error {}

export function publicBase(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Public archive URL is not configured')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || url.hostname.endsWith('.r2.cloudflarestorage.com')) throw new Error('Use an HTTPS public bucket URL')
  return url.href.replace(/\/$/, '')
}

async function readJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, mode: 'cors', credentials: 'omit', cache: 'no-store' })
  if (response.status === 404) throw new EntryNotFound('Entry not found')
  if (!response.ok) throw new Error(`Archive returned HTTP ${response.status}`)
  return response.json()
}

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid archive data')
  return value as Record<string, unknown>
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function loadEntry(id: string, base: string, signal: AbortSignal): Promise<Entry> {
  if (!validId(id)) throw new EntryNotFound('Invalid entry ID')
  const root = publicBase(base)
  const manifest = await readJson(`${root}/entries/manifest.json`, signal)
  if (!Array.isArray(manifest)) throw new Error('Invalid manifest')
  const pairs = manifest.map(object)
  if (pairs.some(pair => typeof pair.id !== 'string' || typeof pair.guid !== 'string'
    || !uuid.test(pair.guid))) throw new Error('Invalid manifest identity')
  const matches = pairs.filter(pair => pair.id === id)
  if (!matches.length) throw new EntryNotFound('Unpublished entry')
  if (matches.length !== 1) throw new Error('Duplicate entry ID')
  const raw = object(await readJson(`${root}/entries/${id}/metadata.json`, signal))
  if (raw.id !== id || raw.guid !== matches[0].guid || typeof raw.createdAt !== 'string'
    || typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt))
    || !Number.isFinite(Date.parse(raw.updatedAt))) throw new Error('Invalid entry metadata')
  const metadata = raw as unknown as EntryMetadata
  const output = `${root}/entries/${id}/outputs`
  const version = `?v=${encodeURIComponent(metadata.updatedAt)}`
  let colors: BirdColor[] = []
  try {
    const payload = object(await readJson(`${output}/colors.json${version}`, signal))
    if (Array.isArray(payload.colors)) colors = payload.colors.flatMap(value => {
      const row = object(value)
      if (!['head', 'body', 'wing', 'tail'].includes(String(row.region)) || typeof row.hex !== 'string'
        || !/^#[0-9a-f]{6}$/i.test(row.hex)) return []
      return [{ region: row.region as BirdColor['region'], hex: row.hex }]
    })
  } catch (error) {
    if (signal.aborted) throw error
    // Optional color data must not prevent viewing or listening to the bird.
  }
  return { metadata, colors, urls: {
    texture: `${output}/texture.png${version}`, audio: `${output}/audio.wav${version}`, qr: `${output}/qr.svg${version}`,
  } }
}

export async function loadConfiguredEntry(id: string, signal: AbortSignal): Promise<Entry> {
  // Configuration failures are not evidence that an individual bird is missing.
  const response = await fetch(`${import.meta.env.BASE_URL}site-config.json`, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load site configuration')
  const config = object(await response.json())
  return loadEntry(id, publicBase(config.r2BaseUrl), signal)
}
