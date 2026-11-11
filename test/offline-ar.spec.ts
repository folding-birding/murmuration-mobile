import { test, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { archive, id } from './fixtures/archive'

for (const portrait of [true, false]) {
  test(`downloaded AR is a centered original-page link without camera or tracking: portrait=${portrait}`, async ({ page, browser }) => {
    await archive(page)
    await page.goto(`/entries/?id=${id}`)
    const sourceUrl = page.url()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download offline HTML' }).click()
    await mkdir('.qa/offline', { recursive: true })
    const path = resolve(`.qa/offline/ar-link-${portrait}.html`)
    await (await download).saveAs(path)
    const html = await readFile(path, 'utf8')
    expect(html).not.toContain('data:application/wasm')
    expect(html).not.toContain('wasm-unsafe-eval')
    const context = await browser.newContext({ offline: true, viewport: portrait ? { width: 390, height: 844 } : { width: 844, height: 390 } })
    try {
      const offline = await context.newPage()
      const external: string[] = []
      context.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()) })
      await offline.addInitScript(() => {
        navigator.mediaDevices.getUserMedia = async () => { throw new Error('Offline AR must not request a camera') }
      })
      const errors: string[] = []
      offline.on('pageerror', error => errors.push(error.message))
      await offline.goto(pathToFileURL(path).href)
      await expect(offline.locator('.bird-id')).toHaveText(id)
      await offline.getByRole('tab', { name: 'AR', exact: true }).click()
      await expect(offline.locator('.entry-track')).toHaveCSS('transform', portrait
        ? 'matrix(1, 0, 0, 1, -780, 0)' : 'matrix(1, 0, 0, 1, 0, -780)')
      const link = offline.locator('.online-ar-link a')
      await expect(link).toBeInViewport()
      await expect(link).toHaveCSS('color', 'rgb(255, 255, 255)')
      await expect(link).toHaveText(sourceUrl)
      await expect(link).toHaveAttribute('href', sourceUrl)
      const body = (await offline.locator('.entry-viewport').boundingBox())!
      const bounds = (await link.boundingBox())!
      expect(bounds.x + bounds.width / 2).toBeCloseTo(body.x + body.width / 2, 1)
      expect(bounds.y + bounds.height / 2).toBeCloseTo(body.y + body.height / 2, 1)
      await expect(offline.locator('video, .debug-frame, .tracking-toggle, .download-button')).toHaveCount(0)
      expect(offline.workers()).toHaveLength(0)
      expect(external).toEqual([])
      expect(errors).toEqual([])
      await offline.screenshot({ path: `.qa/offline/ar-link-${portrait}.png` })
      await context.route(sourceUrl, route => route.fulfill({ contentType: 'text/html', body: '<title>Original entry</title>' }))
      const opened = context.waitForEvent('page')
      await link.click()
      const original = await opened
      await expect(original).toHaveURL(sourceUrl)
      await original.close()
      await offline.getByRole('tab', { name: '3D View', exact: true }).click()
      await expect(offline.locator('.bird-preview')).toHaveAttribute('data-state', 'ready')
    } finally { await context.close() }
  })
}
