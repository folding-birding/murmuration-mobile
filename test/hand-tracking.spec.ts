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
