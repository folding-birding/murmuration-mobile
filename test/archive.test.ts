import { afterEach, describe, expect, it, vi } from 'vitest'
import { EntryNotFound, loadConfiguredEntry, loadEntry, publicBase } from '../src/archive/client'
import { validId } from '../src/archive/id'

const id = '20261110123456'
const guid = '550e8400-e29b-41d4-a716-446655440000'
const metadata = { id, guid, createdAt: '2026-11-10T12:34:56Z', updatedAt: '2026-11-10T12:40:00Z' }
const base = 'https://archive.example.org'
const signal = () => new AbortController().signal
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
const responses = (...values: Response[]) => {
  const fetch = vi.fn()
  values.forEach(value => fetch.mockResolvedValueOnce(value))
  vi.stubGlobal('fetch', fetch)
  return fetch
}
afterEach(() => vi.unstubAllGlobals())

describe('archive identity', () => {
  it('accepts UTC IDs and leap days', () => {
    expect(validId(id)).toBe(true)
    expect(validId('20240229000000')).toBe(true)
  })
  it.each(['20260229000000', '20261110123456000000', '../20261110123456', '20261310123456', '20261110240000', ''])('rejects invalid ID %s', value => {
    expect(validId(value)).toBe(false)
  })
  it('only allows public HTTPS configuration', () => {
    expect(publicBase(`${base}/`)).toBe(base)
    for (const invalid of ['', 'http://example.org', 'https://user:secret@example.org', 'https://account.r2.cloudflarestorage.com/bucket', `${base}?token=secret`]) {
      expect(() => publicBase(invalid)).toThrow()
    }
  })
})

describe('archive loading', () => {
  it('checks the published ID/GUID pair and versions output URLs', async () => {
    const fetch = responses(json([{ id, guid }]), json(metadata), json({ colors: [{ region: 'wing', hex: '#63b4ff', rgb: [99, 180, 255] }] }))
    const entry = await loadEntry(id, base, signal())
    expect(entry.metadata).toEqual(metadata)
    expect(entry.colors).toEqual([{ region: 'wing', hex: '#63b4ff' }])
    expect(entry.urls.texture).toBe(`${base}/entries/${id}/outputs/texture.png?v=2026-11-10T12%3A40%3A00Z`)
    expect(fetch.mock.calls[0]).toEqual([`${base}/entries/manifest.json`, expect.objectContaining({ credentials: 'omit', cache: 'no-store' })])
  })
  it('does not load an unpublished entry', async () => {
    const fetch = responses(json([]))
    await expect(loadEntry(id, base, signal())).rejects.toBeInstanceOf(EntryNotFound)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('treats missing metadata as not found', async () => {
    responses(json([{ id, guid }]), json({}, 404))
    await expect(loadEntry(id, base, signal())).rejects.toBeInstanceOf(EntryNotFound)
  })
  it.each([403, 429, 500])('does not interpret HTTP %s as a missing bird', async status => {
    responses(json({}, status))
    await expect(loadEntry(id, base, signal())).rejects.not.toBeInstanceOf(EntryNotFound)
  })
  it('rejects a mismatched identity', async () => {
    responses(json([{ id, guid }]), json({ ...metadata, guid: 'different' }))
    await expect(loadEntry(id, base, signal())).rejects.toThrow('Invalid entry metadata')
  })
  it('rejects duplicate IDs', async () => {
    responses(json([{ id, guid }, { id, guid }]))
    await expect(loadEntry(id, base, signal())).rejects.toThrow('Duplicate entry ID')
  })
  it('displays the bird without optional colors', async () => {
    responses(json([{ id, guid }]), json(metadata), json({}, 404))
    expect((await loadEntry(id, base, signal())).colors).toEqual([])
  })
  it('ignores unknown regions and unsafe colors', async () => {
    responses(json([{ id, guid }]), json(metadata), json({ colors: [{ region: 'head', hex: 'url(evil)' }, { region: 'unknown', hex: '#ffffff' }] }))
    expect((await loadEntry(id, base, signal())).colors).toEqual([])
  })
  it('preserves cancellation while reading optional colors', async () => {
    const controller = new AbortController()
    const fetch = responses(json([{ id, guid }]), json(metadata))
    fetch.mockImplementationOnce(() => {
      controller.abort()
      throw new DOMException('Aborted', 'AbortError')
    })
    await expect(loadEntry(id, base, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('does not confuse a missing site configuration with a missing bird', async () => {
    responses(json({}, 404))
    await expect(loadConfiguredEntry(id, signal())).rejects.not.toBeInstanceOf(EntryNotFound)
  })
})
