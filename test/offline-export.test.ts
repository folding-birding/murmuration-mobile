import { describe, expect, it } from 'vitest'
import { renderHtml as serializeHtml } from '../src/offline/export'
import type { Entry } from '../src/archive/types'

const entry: Entry = {
  metadata: { id: '20260619115959', guid: '00000000-0000-4000-8000-000000000000', createdAt: '2026-06-19T11:59:59Z', updatedAt: '2026-06-19T11:59:59Z' },
  colors: [],
  urls: { texture: 'data:image/png;base64,AA==', audio: 'data:audio/wav;base64,AA==', qr: 'data:image/svg+xml;base64,AA==' },
}
const sourceUrl = 'https://example.com/entries/?id=20260619115959'
const renderHtml = (entry: Entry, runtime: Parameters<typeof serializeHtml>[1]) => serializeHtml(entry, runtime, sourceUrl)
const runtime = { script: 'window.ready = true;', css: 'body{color:black}', notices: 'Font and library licenses' }

describe('standalone HTML serialization', () => {
  it('preserves the original page URL and rejects executable link protocols', () => {
    expect(renderHtml(entry, runtime)).toContain(sourceUrl)
    expect(() => serializeHtml(entry, runtime, 'javascript:alert(1)')).toThrow('Invalid online entry URL')
  })
  it('embeds data, styles, and code while blocking external resource requests', () => {
    const html = renderHtml(entry, runtime)
    expect(html).toContain('id="bird-data"')
    expect(html).toContain(entry.urls.audio)
    expect(html).toContain(runtime.script)
    expect(html).toContain(runtime.css)
    expect(html).toContain("default-src 'none'")
    expect(html).not.toContain('src="http')
    expect(html).not.toContain("worker-src blob:")
    expect(html).not.toContain("'wasm-unsafe-eval'")
    expect(html).toContain('connect-src data: blob:')
    expect(html).not.toContain("'unsafe-eval'")
  })
  it('rejects incomplete exports that still reference remote media', () => {
    expect(() => renderHtml({ ...entry, urls: { ...entry.urls, texture: 'https://example.com/texture.png' } }, runtime)).toThrow('must be embedded')
  })
  it('rejects IDs that could inject HTML', () => {
    expect(() => renderHtml({ ...entry, metadata: { ...entry.metadata, id: '</title><script>' } }, runtime)).toThrow('Invalid bird ID')
  })
  it('prevents embedded JSON and code strings from ending their HTML elements', () => {
    const html = renderHtml({ ...entry, metadata: { ...entry.metadata, guid: '</script><img src=x>' } }, { script: 'const value="</script>";', css: 'p:after{content:"</style>"}', notices: '</script>' })
    expect(html).not.toContain('</script><img')
    expect(html.match(/<\/script>/g)).toHaveLength(3)
    expect(html.match(/<\/style>/g)).toHaveLength(1)
  })
})
