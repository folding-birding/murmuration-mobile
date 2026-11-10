import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

test('downloaded HTML works in a fresh browser context with the network disabled', async ({ page, request, browser, isMobile }, testInfo) => {
  const config = await (await request.get('/site-config.json')).json()
  const manifest = await (await request.get(`${config.r2BaseUrl}/entries/manifest.json`)).json()
  const id = process.env.LIVE_ARCHIVE_ID || manifest[0]?.id
  expect(id).toMatch(/^\d{14}$/)
  await page.goto(`/entries/?id=${id}`)
  await expect(page.getByRole('tab', { name: 'QR', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 30_000 })
  const textureUrl = (await page.getByRole('img', { name: 'QR code for this bird' }).getAttribute('src'))!.replace('/qr.svg', '/texture.png')
  const sourceUrls = {
    texture: textureUrl,
    audio: await page.locator('audio').getAttribute('src'),
    qr: await page.getByRole('img', { name: 'QR code for this bird' }).getAttribute('src'),
  }
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download offline HTML' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(`murmuration-${id}.html`)
  await mkdir('.qa/offline', { recursive: true })
  const path = resolve(`.qa/offline/murmuration-${id}-${testInfo.project.name}.html`)
  await download.saveAs(path)
  const html = await readFile(path, 'utf8')
  const payload = JSON.parse(html.match(/<script type="application\/json" id="bird-data">([\s\S]*?)<\/script>/)![1])
  for (const key of ['texture', 'audio', 'qr'] as const) {
    const original = await (await request.get(sourceUrls[key]!)).body()
    const embedded = Buffer.from(payload.urls[key].split(',')[1], 'base64')
    expect(createHash('sha256').update(embedded).digest('hex')).toBe(createHash('sha256').update(original).digest('hex'))
  }

  const context = await browser.newContext({ offline: true, viewport: isMobile ? { width: 390, height: 844 } : { width: 1366, height: 1024 }, hasTouch: isMobile, isMobile })
  try {
    const offline = await context.newPage()
    const network: string[] = [], errors: string[] = []
    offline.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()) })
    offline.on('pageerror', error => errors.push(error.message))
    offline.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await offline.goto(pathToFileURL(path).href)
    await expect(offline.getByRole('heading', { name: id })).toBeVisible()
    const visibleId = offline.locator('.bird-id')
    await expect(visibleId).toHaveText(id)
    await expect(visibleId).toBeVisible()
    await expect(visibleId).toHaveCSS('font-size', '18px')
    await expect(visibleId).toHaveCSS('font-weight', '700')
    await offline.evaluate(() => document.fonts.ready)
    expect(await offline.evaluate(() => document.fonts.check('700 18px Pretendard'))).toBe(true)
    const qrBounds = (await offline.locator('.bird-qr').boundingBox())!
    const idBounds = (await visibleId.boundingBox())!
    expect(idBounds.y).toBe(qrBounds.y + qrBounds.height)
    expect(idBounds.x + idBounds.width / 2).toBeCloseTo(qrBounds.x + qrBounds.width / 2, 1)
    await offline.screenshot({ path: `.qa/offline/qr-${testInfo.project.name}.png` })
    await expect(offline.locator('.html-export, .download-button, a[download]')).toHaveCount(0)
    await expect(offline.getByRole('button', { name: 'Download offline HTML' })).toHaveCount(0)
    const qr = offline.getByRole('img', { name: 'QR code for this bird' })
    await expect.poll(() => qr.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await offline.getByRole('tab', { name: '3D View', exact: true }).click()
    const viewer = offline.locator('.bird-preview')
    await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
    await expect(offline.locator('.html-export, .download-button, a[download]')).toHaveCount(0)
    await expect(offline.getByRole('button', { name: 'Download offline HTML' })).toHaveCount(0)
    const first = await viewer.screenshot()
    await offline.waitForTimeout(300)
    expect(await viewer.screenshot()).not.toEqual(first)
    const yaw = await viewer.getAttribute('data-yaw')
    await viewer.focus()
    await offline.keyboard.press('ArrowRight')
    await expect(viewer).not.toHaveAttribute('data-yaw', yaw!)
    if (isMobile) {
      await viewer.scrollIntoViewIfNeeded()
      const bounds = (await viewer.boundingBox())!
      await offline.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      await offline.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    } else await viewer.dblclick()
    await expect(offline.locator('audio')).toHaveJSProperty('paused', false)
    await expect.poll(() => offline.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0)
    await offline.getByRole('tab', { name: 'QR', exact: true }).click()
    await expect(offline.locator('audio')).toHaveJSProperty('paused', true)
    await expect(offline.getByRole('tab')).toHaveCount(2)
    await offline.getByRole('tab', { name: '3D View', exact: true }).click()
    await expect(viewer).toHaveAttribute('data-state', 'ready')
    expect(await offline.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(network).toEqual([])
    expect(errors).toEqual([])
    await offline.screenshot({ path: `.qa/offline/${testInfo.project.name}.png`, fullPage: true })
    await testInfo.attach('offline-export', { body: JSON.stringify({ id, bytes: Buffer.byteLength(html), path, network, errors }), contentType: 'application/json' })
  } finally { await context.close() }
})

test('a failed asset download does not produce an incomplete HTML file', async ({ page, request }) => {
  const config = await (await request.get('/site-config.json')).json()
  const manifest = await (await request.get(`${config.r2BaseUrl}/entries/manifest.json`)).json()
  await page.goto(`/entries/?id=${process.env.LIVE_ARCHIVE_ID || manifest[0]?.id}`)
  await expect(page.getByRole('tab', { name: 'QR', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 30_000 })
  await page.route('**/outputs/texture.png*', route => route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' } }))
  let downloads = 0
  page.on('download', () => downloads++)
  await page.getByRole('button', { name: 'Download offline HTML' }).click()
  await expect(page.locator('.html-export [role=status]')).toContainText('Unable to save')
  await expect(page.getByRole('button', { name: 'Download offline HTML' })).toBeEnabled()
  expect(downloads).toBe(0)
})
