import { test, expect } from '@playwright/test'
import { archive, id, base } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'

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

test('ID form loads the real animated model and plays audio', async ({ page }) => {
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
  await page.getByRole('tab', { name: '3D View', exact: true }).click()
  const viewer = page.locator('.bird-preview')
  await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  const yaw = await viewer.getAttribute('data-yaw')
  await viewer.focus(); await page.keyboard.press('ArrowRight')
  await expect(viewer).not.toHaveAttribute('data-yaw', yaw!)
  await viewer.dblclick()
  await expect(page.locator('audio')).toHaveJSProperty('paused', false)
  await page.getByRole('tab', { name: 'QR', exact: true }).click()
  await expect(page.locator('audio')).toHaveJSProperty('paused', true)
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

test('mobile layout fits and supports touch rotation and double-tap audio', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await archive(page)
  await page.goto(`https://127.0.0.1:4000/entries/?id=${id}`)
  await page.getByRole('tab', { name: '3D View', exact: true }).click()
  const viewer = page.locator('.bird-preview')
  await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.locator('.bird-qr img')).toHaveJSProperty('naturalWidth', 384)
  const rect = (await viewer.boundingBox())!
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2
  const session = await context.newCDPSession(page)
  const yaw = await viewer.getAttribute('data-yaw')
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y }] })
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(viewer).not.toHaveAttribute('data-yaw', yaw!)
  await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y)
  await expect(page.locator('audio')).toHaveJSProperty('paused', false)
  await expect(page.locator('.bird-entry')).toHaveAttribute('data-slide', '1')
  await page.screenshot({ path: '.qa/bird-mobile.png', fullPage: true })
  await context.close()
})

test('mobile frames keep their dimensions and swipe through QR, 3D, and AR', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await fakeCamera(page)
  await archive(page)
  await page.goto('https://127.0.0.1:4000/entries/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.lookup-symbol img')).toHaveCSS('width', '160px')
  expect(await page.locator('.lookup-symbol img').boundingBox()).toEqual({ x: 80, y: 204, width: 160, height: 160 })
  expect(await page.locator('.lookup-input input').boundingBox()).toEqual({ x: 32, y: 461, width: 224, height: 30 })
  await page.screenshot({ path: '.qa/figma-lookup-320.png' })
  await page.getByLabel('Bird ID', { exact: true }).fill(id)
  await page.getByRole('button', { name: 'Find my bird' }).click()
  const entry = page.locator('.bird-entry')
  await expect(entry).toHaveAttribute('data-slide', '0')
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
  const session = await context.newCDPSession(page)
  async function swipe(from: number, to: number) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y: 520 }] })
    for (let step = 1; step <= 5; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + (to - from) * step / 5, y: 520 }] })
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await swipe(240, 70)
  await expect(entry).toHaveAttribute('data-slide', '1')
  const viewer = page.locator('.bird-preview')
  await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  const first = await viewer.screenshot()
  await page.waitForTimeout(300)
  expect(await viewer.screenshot()).not.toEqual(first)
  await page.screenshot({ path: '.qa/figma-3d-320.png' })
  await swipe(240, 70)
  await expect(entry).toHaveAttribute('data-slide', '2')
  await expect(page.locator('.camera-view')).toHaveAttribute('data-state', 'ready')
  await expect(page.getByRole('tab')).toHaveCount(3)
  await expect(page.locator('.entry-header')).toBeVisible()
  await swipe(240, 70)
  await expect(entry).toHaveAttribute('data-slide', '2')
  await swipe(70, 240)
  await expect(entry).toHaveAttribute('data-slide', '1')
  await swipe(70, 240)
  await expect(entry).toHaveAttribute('data-slide', '0')
  await swipe(70, 240)
  await expect(entry).toHaveAttribute('data-slide', '0')
  await page.getByRole('tab', { name: 'QR', exact: true }).focus()
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'AR', exact: true })).toBeFocused()
  await expect(entry).toHaveAttribute('data-slide', '2')
  await page.keyboard.press('ArrowRight')
  await expect(entry).toHaveAttribute('data-slide', '2')
  await page.keyboard.press('Home')
  await expect(entry).toHaveAttribute('data-slide', '0')
  await page.getByRole('link', { name: 'Find another bird' }).click()
  await expect(page.getByLabel('Bird ID', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight === innerHeight)).toBe(true)
  await context.close()
})

for (const viewport of [
  { width: 320, height: 568 }, { width: 390, height: 844 },
  { width: 568, height: 320 }, { width: 844, height: 390 },
]) {
  test(`body square owns rotation in ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true })
    try {
      const page = await context.newPage()
      await archive(page)
      await page.goto(`https://127.0.0.1:4000/entries/?id=${id}`)
      const viewer = page.locator('.bird-preview')
      const entry = page.locator('.bird-entry')
      const session = await context.newCDPSession(page)
      const landscape = viewport.width > viewport.height
      const bodyWidth = viewport.width - (landscape ? 120 : 0)
      const bodyHeight = viewport.height - (landscape ? 0 : 120)
      async function showModel() {
        await page.getByRole('tab', { name: '3D View', exact: true }).click()
        await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
        await expect(page.locator('.entry-track')).toHaveCSS('transform', landscape ? `matrix(1, 0, 0, 1, 0, -${bodyHeight})` : `matrix(1, 0, 0, 1, -${bodyWidth}, 0)`)
      }
      async function gesture(x: number, y: number, endX: number, endY = y) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
        for (let step = 1; step <= 5; step++) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (endX - x) * step / 5, y: y + (endY - y) * step / 5 }] })
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      }
      await showModel()
      const side = Math.min(bodyWidth, bodyHeight)
      const left = (viewport.width - side) / 2
      const top = (viewport.height - side) / 2
      const portrait = bodyWidth <= bodyHeight
      expect(await viewer.boundingBox()).toEqual({ x: left, y: top, width: side, height: side })
      expect((await page.locator('canvas').boundingBox())!.width).toBe(side - 48)
      const yaw = await viewer.getAttribute('data-yaw')
      // Rotation remains assigned after the touch crosses the square boundary.
      if (portrait) await gesture(left + 10, top + 10, left + 130, top - 10)
      else await gesture(left + side - 10, top + 100, left + side + 30)
      await expect(viewer).not.toHaveAttribute('data-yaw', yaw!)
      await expect(entry).toHaveAttribute('data-slide', '1')
      await page.touchscreen.tap(viewport.width / 2, viewport.height / 2)
      await page.touchscreen.tap(viewport.width / 2, viewport.height / 2)
      await expect(page.locator('audio')).toHaveJSProperty('paused', false)
      // Navigation remains assigned after a touch enters the square from body whitespace.
      if (portrait) await gesture(60, top - 16, viewport.width - 60, top + 16)
      else await gesture(left - 16, 60, left + 16, viewport.height - 60)
      await expect(entry).toHaveAttribute('data-slide', '0')
      await expect(page.locator('audio')).toHaveJSProperty('paused', true)
      await showModel()
      if (portrait) await gesture(60, top + side + 16, viewport.width - 60)
      else await gesture(left + side + 16, 60, left + side + 16, viewport.height - 60)
      await expect(entry).toHaveAttribute('data-slide', '0')
      await showModel()
      await page.screenshot({ path: `.qa/body-square-${viewport.width}x${viewport.height}.png` })
      // The square resizes when the device rotates without reloading the model.
      const rotated = { width: viewport.height, height: viewport.width }
      await page.setViewportSize(rotated)
      const rotatedLandscape = rotated.width > rotated.height
      const rotatedSide = Math.min(rotated.width - (rotatedLandscape ? 120 : 0), rotated.height - (rotatedLandscape ? 0 : 120))
      await expect.poll(() => viewer.boundingBox()).toEqual({
        x: (rotated.width - rotatedSide) / 2,
        y: (rotated.height - rotatedSide) / 2,
        width: rotatedSide, height: rotatedSide,
      })
      await expect(viewer).toHaveAttribute('data-state', 'ready')
    } finally { await context.close() }
  })
}
