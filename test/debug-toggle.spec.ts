import { showDebug } from './fixtures/debug'
import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'
import { fakeOrientation } from './fixtures/orientation'
import { fakeHandTracker } from './fixtures/hand-tracker'
import { openHand } from './fixtures/open-hand'

test.use({ hasTouch: true })

for (const portrait of [true, false]) {
  test(`four-finger debug toggle preserves AR and rearms after release: portrait=${portrait}`, async ({ page, context }) => {
    await archive(page)
    await fakeCamera(page)
    await fakeOrientation(page)
    await fakeHandTracker(page, openHand())
    await page.setViewportSize(portrait ? { width: 390, height: 844 } : { width: 844, height: 390 })
    await page.goto(`/entries/?id=${id}`)
    await page.evaluate(() => { window.orientationTest.beta = 90 })
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    const debug = page.locator('.debug-frame')
    await expect(debug).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'GPU acceleration' })).toHaveCount(0)
    const bird = page.locator('.interactive-bird')
    await expect(bird).toHaveAttribute('data-state', 'hovering')
    await showDebug(page)
    await expect(page.locator('.hand-overlay')).toHaveAttribute('data-hands', '1')
    const video = page.locator('video')
    const stream = await video.evaluateHandle((element: HTMLVideoElement) => element.srcObject)
    const canvas = await bird.locator('canvas').elementHandle()
    const cameraCalls = await page.evaluate(() => window.cameraTest.calls.length)
    const cdp = await context.newCDPSession(page)
    const bounds = (await page.locator('.camera-view').boundingBox())!
    const points = Array.from({ length: 5 }, (_, index) => ({ id: index + 1,
      x: bounds.x + bounds.width / 2 + (index - 2) * 35, y: bounds.y + bounds.height / 2 }))
    const touch = async (count: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.slice(0, count) })
    }
    await touch(3)
    await expect(debug).toHaveCount(1)
    await touch(4)
    await expect(debug).toHaveCount(0)
    await touch(5)
    await expect(debug).toHaveCount(0)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: points.slice(3) })
    await touch(4)
    await expect(debug).toHaveCount(0)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.slice(0, 4).map(p => ({ ...p, x: p.x - 60, y: p.y - 60 })) })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(page.locator('.bird-entry')).toHaveAttribute('data-slide', '2')
    const original = (await bird.boundingBox())!
    await page.evaluate(() => { window.handTest.frame!.landmarks[0].forEach(point => { point.x += .06 }) })
    await expect.poll(async () => Math.abs((await bird.boundingBox())!.x - original.x)).toBeGreaterThan(15)
    await expect(bird).toHaveAttribute('data-state', 'hovering')
    await expect(page.getByRole('button', { name: 'GPU acceleration' })).toHaveCount(0)
    expect(await video.evaluate((element: HTMLVideoElement, original) => element.srcObject === original, stream)).toBe(true)
    expect(await bird.locator('canvas').evaluate((element, original) => element === original, canvas)).toBe(true)
    expect(await page.evaluate(() => window.cameraTest.calls.length)).toBe(cameraCalls)
    await touch(4)
    await expect(debug).toHaveCount(1)
    await expect(debug.locator('[data-vector=normal]')).toBeVisible()
    const toggle = debug.getByRole('button', { name: 'GPU acceleration' })
    await expect(toggle).toBeVisible()
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    await toggle.click()
    await expect(toggle).toHaveText('GPU')
    await touch(4)
    await expect(debug).toHaveCount(0)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await video.evaluate((element: HTMLVideoElement) => {
      (element.srcObject as MediaStream).getVideoTracks()[0].dispatchEvent(new Event('ended'))
    })
    await expect(page.locator('.camera-view')).toHaveAttribute('data-state', 'paused')
    await page.getByRole('button', { name: 'Restart camera' }).click()
    await expect(page.locator('.camera-view')).toHaveAttribute('data-state', 'ready')
    await expect(debug).toHaveCount(0)
    await page.getByRole('tab', { name: 'QR', exact: true }).click()
    await expect(page.locator('.camera-view')).toHaveCount(0)
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    await expect(debug).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'GPU acceleration' })).toHaveCount(0)
  })
}


test('only touches started inside the camera count and outside contacts do not block rearming', async ({ page, context }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeHandTracker(page, openHand())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  await expect(page.locator('.entry-track')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -780, 0)')
  const debug = page.locator('.debug-frame')
  await expect(debug).toHaveCount(0)
  await showDebug(page)
  const cdp = await context.newCDPSession(page)
  const outside = { id: 1, x: 20, y: 20 }
  const inside = Array.from({ length: 4 }, (_, index) => ({ id: index + 2, x: 110 + index * 40, y: 400 }))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [outside] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [outside, ...inside.slice(0, 3)] })
  await expect(debug).toHaveCount(1)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [outside, ...inside] })
  await expect(debug).toHaveCount(0)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: inside })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [outside, ...inside] })
  await expect(debug).toHaveCount(1)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('.bird-entry')).toHaveAttribute('data-slide', '2')
})
