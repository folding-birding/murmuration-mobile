import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'

test('MediaPipe detects a real hand, aligns the overlay, and stops on exit', async ({ page }) => {
  await archive(page)
  await page.route('**/__test__/hand.jpg', route => route.fulfill({ path: 'test/fixtures/hand.jpg', contentType: 'image/jpeg' }))
  await fakeCamera(page, '/__test__/hand.jpg')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/entries/?id=${id}`)
  expect(page.workers()).toHaveLength(0)
  await page.evaluate(() => { window.cameraTest.facing = 'user' })
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  const overlay = page.locator('.hand-overlay')
  await expect(overlay).toHaveAttribute('data-state', 'ready', { timeout: 40_000 })
  await expect(overlay).toHaveAttribute('data-hands', '1', { timeout: 15_000 })
  await expect(overlay).toHaveCSS('transform', 'matrix(-1, 0, 0, 1, 0, 0)')
  expect(await overlay.boundingBox()).toEqual(await page.locator('video').boundingBox())
  expect(await overlay.evaluate((canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0))).toBe(true)
  await expect.poll(async () => Number(await page.locator('[data-metric=fps]').textContent())).toBeGreaterThan(0)
  await expect(page.locator('[data-metric=delegate]')).toHaveText(/^(GPU|CPU)$/)
  await expect.poll(async () => Number(await page.locator('[data-metric=inference]').textContent())).toBeGreaterThan(0)
  await expect.poll(async () => Number(await page.locator('[data-metric=total]').textContent())).toBeGreaterThan(0)
  const timings = await page.locator('.tracking-debug').evaluate(element => ({
    fps: Number(element.querySelector('[data-metric=fps]')!.textContent),
    totalFps: Number(element.querySelector('[data-metric=total-fps]')!.textContent),
    inference: Number(element.querySelector('[data-metric=inference]')!.textContent),
    total: Number(element.querySelector('[data-metric=total]')!.textContent),
  }))
  expect(timings.total).toBeGreaterThanOrEqual(timings.inference)
  expect(Math.abs(timings.fps * timings.inference - 1000)).toBeLessThan(timings.fps * 0.06 + timings.inference * 0.06)
  expect(Math.abs(timings.totalFps * timings.total - 1000)).toBeLessThan(timings.totalFps * 0.06 + timings.total * 0.06)
  await expect(page.locator('.tracking-debug > div')).toHaveCount(4)
  await expect(page.locator('.tracking-debug')).toHaveCSS('font-size', '12px')
  await expect(page.locator('[data-metric=angle], [data-metric=gravity]')).toHaveCount(0)
  const dimensions = await page.locator('video').evaluate((video: HTMLVideoElement) => ({ width: video.videoWidth, height: video.videoHeight }))
  await expect(page.locator('[data-metric=camera]')).toHaveText(`${dimensions.width} × ${dimensions.height}`)
  const scale = Math.min(1, 640 / Math.max(dimensions.width, dimensions.height))
  await expect(page.locator('[data-metric=input]')).toHaveText(`${Math.round(dimensions.width * scale)} × ${Math.round(dimensions.height * scale)}`)
  await page.screenshot({ path: '.qa/hand-tracking-portrait.png' })
  const worker = page.workers()[0]
  expect(worker).toBeTruthy()
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('.entry-track')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -780)')
  await expect(overlay).toHaveAttribute('data-hands', '1')
  expect(await overlay.boundingBox()).toEqual(await page.locator('video').boundingBox())
  expect(page.workers()).toEqual([worker])
  await page.screenshot({ path: '.qa/hand-tracking-landscape.png' })
  await page.getByRole('tab', { name: 'QR', exact: true }).click()
  await expect.poll(() => page.workers().length).toBe(0)
  await expect(overlay).toHaveCount(0)
  expect(errors).toEqual([])
})

test('model loading failure leaves the camera active and supports retry', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  let fail = true
  await page.route('**/*.task*', route => fail ? route.abort() : route.continue())
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  await expect(page.locator('.hand-overlay')).toHaveAttribute('data-state', 'failed', { timeout: 40_000 })
  await expect(page.locator('video')).toHaveJSProperty('paused', false)
  await expect.poll(() => page.workers().length).toBe(0)
  fail = false
  await page.getByRole('button', { name: 'Restart hand tracking' }).click()
  await expect(page.locator('.hand-overlay')).toHaveAttribute('data-state', 'ready', { timeout: 40_000 })
  await expect(page.locator('.hand-overlay')).toHaveAttribute('data-hands', '0')
})

test('unsupported frame capture fails gracefully without stopping the camera', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await page.addInitScript(() => {
    window.createImageBitmap = () => { throw new TypeError('Unsupported video source') }
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  await expect(page.locator('.hand-overlay')).toHaveAttribute('data-state', 'failed', { timeout: 40_000 })
  await expect(page.locator('video')).toHaveJSProperty('paused', false)
  await expect.poll(() => page.workers().length).toBe(0)
  expect(errors).toEqual([])
})

test('CPU/GPU toggle replaces the worker and keeps the same camera stream', async ({ page }) => {
  await archive(page)
  await page.route('**/__test__/hand.jpg', route => route.fulfill({ path: 'test/fixtures/hand.jpg', contentType: 'image/jpeg' }))
  await fakeCamera(page, '/__test__/hand.jpg')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  const toggle = page.getByRole('button', { name: 'GPU acceleration' })
  await expect(toggle).toHaveText('CPU')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('[data-metric=delegate]')).toHaveText('CPU', { timeout: 40_000 })
  const initialCalls = await page.evaluate(() => window.cameraTest.calls.length)
  const stream = await page.locator('video').evaluateHandle((video: HTMLVideoElement) => video.srcObject)
  for (const delegate of ['GPU', 'CPU']) {
    const oldWorker = page.workers()[0]
    const closed = oldWorker.waitForEvent('close')
    await toggle.click()
    await closed
    await expect(toggle).toHaveText(delegate)
    await expect(page.locator('[data-metric=delegate]')).toHaveText(delegate, { timeout: 40_000 })
    await expect(page.locator('.hand-overlay')).toHaveAttribute('data-hands', '1')
    expect(page.workers()).toHaveLength(1)
    expect(page.workers()[0]).not.toBe(oldWorker)
    expect(await page.locator('video').evaluate((video: HTMLVideoElement, original) => video.srcObject === original, stream)).toBe(true)
    expect(await page.evaluate(() => window.cameraTest.calls.length)).toBe(initialCalls)
    await expect(page.locator('.bird-entry')).toHaveAttribute('data-slide', '2')
  }
  await page.screenshot({ path: '.qa/hand-toggle-portrait.png' })
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('.entry-track')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -780)')
  const body = (await page.locator('.camera-view').boundingBox())!
  const bounds = (await toggle.boundingBox())!
  expect(bounds.y).toBe(body.y + 12)
  expect(bounds.x + bounds.width).toBe(body.x + body.width - 12)
  await page.screenshot({ path: '.qa/hand-toggle-landscape.png' })
})
