import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const id = '20261110123456'
const guid = '550e8400-e29b-41d4-a716-446655440000'
const metadata = { id, guid, createdAt: '2026-11-10T12:34:56Z', updatedAt: '2026-11-10T12:40:00Z' }
const base = 'https://archive.example.org'
const qr = readFileSync(new URL('./fixtures/qr.svg', import.meta.url), 'utf8')
async function archive(page: Page, manifestStatus = 200, exists = true) {
  await page.route('**/site-config.json', route => route.fulfill({ json: { r2BaseUrl: base } }))
  await page.route(`${base}/**`, async route => {
    const path = new URL(route.request().url()).pathname
    const headers = { 'Access-Control-Allow-Origin': '*' }
    if (path.endsWith('/manifest.json')) return route.fulfill({ status: manifestStatus, headers, json: exists ? [{ id, guid }] : [] })
    if (path.endsWith('/metadata.json')) return route.fulfill({ headers, json: metadata })
    if (path.endsWith('/colors.json')) return route.fulfill({ headers, json: { colors: [{ region: 'head', hex: '#ef765b' }, { region: 'wing', hex: '#f7e9b2' }] } })
    if (path.endsWith('/qr.svg')) return route.fulfill({ headers, contentType: 'image/svg+xml', body: qr })
    return route.fulfill({ status: 404, headers })
  })
}

test('root leads to an accessible ID form without contacting R2', async ({ page }) => {
  const external: string[] = []
  page.on('request', request => { if (!request.url().startsWith('https://127.0.0.1:4000')) external.push(request.url()) })
  await page.goto('/')
  await expect(page).toHaveURL(/\/entries\/$/)
  await expect(page.getByRole('heading', { name: 'Find your bird' })).toBeVisible()
  await page.getByRole('button', { name: 'Find my bird' }).click()
  await expect(page.getByRole('alert')).toContainText('valid 14-digit')
  expect(external).toEqual([])
  expect(await page.locator('.page').evaluate(element => {
    const copy = element.cloneNode(true) as HTMLElement
    copy.querySelectorAll('.sr-only, [aria-hidden=true]').forEach(node => node.remove())
    return copy.textContent?.trim()
  })).toBe('')
  await page.screenshot({ path: '.qa/lookup-desktop.png', fullPage: true })
})

test('ID form loads the archived QR', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await archive(page)
  await page.goto('/entries/')
  await page.getByLabel('Bird ID', { exact: true }).fill(id)
  await page.getByRole('button', { name: 'Find my bird' }).click()
  await expect(page).toHaveURL(new RegExp(`id=${id}$`))
  await expect(page.getByRole('heading', { name: id })).toBeVisible()
  const qrImage = page.getByRole('img', { name: 'QR code for this bird' })
  await expect(qrImage).toHaveAttribute('src', `${base}/entries/${id}/outputs/qr.svg?v=2026-11-10T12%3A40%3A00Z`)
  await expect(qrImage).toHaveJSProperty('naturalWidth', 384)
  expect(await page.locator('.page').evaluate(element => {
    const copy = element.cloneNode(true) as HTMLElement
    copy.querySelectorAll('.sr-only, [aria-hidden=true]').forEach(node => node.remove())
    return copy.textContent?.trim()
  })).toBe(id)
  await page.screenshot({ path: '.qa/bird-desktop.png', fullPage: true })
  expect(errors).toEqual([])
})

test('root QR links preserve the entry ID when opening the viewer', async ({ page }) => {
  await archive(page)
  await page.goto(`/?id=${id}`)
  await expect(page).toHaveURL(new RegExp(`/entries/\\?id=${id}$`))
  await expect(page.getByRole('heading', { name: id })).toBeVisible()
  await expect(page.getByRole('img', { name: 'QR code for this bird' })).toHaveJSProperty('naturalWidth', 384)
})

test('unknown ID returns to the input screen', async ({ page }) => {
  await archive(page, 200, false)
  await page.goto(`/entries/?id=${id}`)
  await expect(page).toHaveURL(/\/entries\/$/)
  await expect(page.getByLabel('Bird ID', { exact: true })).toBeVisible()
})

for (const query of ['id=bad', 'id=', `id=${id}&id=${id}`]) {
  test(`invalid query returns to input: ${query}`, async ({ page }) => {
    await page.goto(`/entries/?${query}`)
    await expect(page).toHaveURL(/\/entries\/$/)
  })
}

test('an outage preserves the ID and allows a successful retry', async ({ page }) => {
  await archive(page, 503)
  await page.goto(`/entries/?id=${id}`)
  await expect(page.getByRole('heading')).toContainText('could not be reached')
  await expect(page).toHaveURL(new RegExp(`id=${id}$`))
  await page.unroute(`${base}/**`)
  await archive(page)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: id })).toBeVisible()
})

test('mobile lookup and QR keep their dimensions', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await archive(page)
  await page.goto('https://127.0.0.1:4000/entries/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.lookup-symbol img')).toHaveCSS('width', '160px')
  expect(await page.locator('.lookup-symbol img').boundingBox()).toEqual({ x: 80, y: 204, width: 160, height: 160 })
  expect(await page.locator('.lookup-input input').boundingBox()).toEqual({ x: 32, y: 461, width: 224, height: 30 })
  await page.screenshot({ path: '.qa/figma-lookup-320.png' })
  await page.getByLabel('Bird ID', { exact: true }).fill(id)
  await page.getByRole('button', { name: 'Find my bird' }).click()
  await expect(page.getByRole('heading', { name: id })).toBeVisible()
  expect(await page.locator('.bird-qr').boundingBox()).toEqual({ x: 57.5, y: 171, width: 205, height: 205 })
  await expect(page.locator('.entry-header')).toHaveCSS('height', '60px')
  await expect(page.locator('.entry-footer')).toHaveCSS('height', '60px')
  await expect(page.locator('.bird-qr img')).toHaveJSProperty('naturalWidth', 384)
  const visibleId = page.locator('.bird-id')
  await expect(visibleId).toHaveText(id)
  await expect(visibleId).toHaveCSS('font-size', '18px')
  await expect(visibleId).toHaveCSS('font-weight', '700')
  await expect(visibleId).toHaveCSS('color', 'rgb(26, 28, 31)')
  const idBounds = (await visibleId.boundingBox())!
  expect(idBounds.y).toBe(376)
  expect(idBounds.height).toBe(21)
  expect(idBounds.x + idBounds.width / 2).toBeCloseTo(160, 1)
  await page.screenshot({ path: '.qa/figma-qr-320.png' })
  await page.getByRole('link', { name: 'Find another bird' }).click()
  await expect(page.getByLabel('Bird ID', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight === innerHeight)).toBe(true)
  await context.close()
})
