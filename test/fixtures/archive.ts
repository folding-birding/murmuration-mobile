import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

export const id = '20261110123456'
const guid = '550e8400-e29b-41d4-a716-446655440000'
const metadata = { id, guid, createdAt: '2026-11-10T12:34:56Z', updatedAt: '2026-11-10T12:40:00Z' }
export const base = 'https://archive.example.org'
const qr = readFileSync(new URL('./qr.svg', import.meta.url), 'utf8')
const texture = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#f7e9b2"/><circle cx="16" cy="16" r="10" fill="#ef765b"/></pattern></defs><rect width="256" height="256" fill="url(#p)"/></svg>'
function wav() {
  const sampleRate = 8000, samples = sampleRate * 3
  const bytes = Buffer.alloc(44 + samples * 2)
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 2, 28)
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40)
  for (let n = 0; n < samples; n++) bytes.writeInt16LE(Math.round(Math.sin(n * Math.PI * 2 * 440 / sampleRate) * 2000), 44 + n * 2)
  return bytes
}
export async function archive(page: Page, manifestStatus = 200, exists = true) {
  await page.route('**/site-config.json', route => route.fulfill({ json: { r2BaseUrl: base } }))
  await page.route(`${base}/**`, async route => {
    const path = new URL(route.request().url()).pathname
    const headers = { 'Access-Control-Allow-Origin': '*' }
    if (path.endsWith('/manifest.json')) return route.fulfill({ status: manifestStatus, headers, json: exists ? [{ id, guid }] : [] })
    if (path.endsWith('/metadata.json')) return route.fulfill({ headers, json: metadata })
    if (path.endsWith('/colors.json')) return route.fulfill({ headers, json: { colors: [{ region: 'head', hex: '#ef765b' }, { region: 'wing', hex: '#f7e9b2' }] } })
    if (path.endsWith('/texture.png')) return route.fulfill({ headers, contentType: 'image/svg+xml', body: texture })
    if (path.endsWith('/audio.wav')) return route.fulfill({ headers, contentType: 'audio/wav', body: wav() })
    if (path.endsWith('/qr.svg')) return route.fulfill({ headers, contentType: 'image/svg+xml', body: qr })
    return route.fulfill({ status: 404, headers })
  })
}
