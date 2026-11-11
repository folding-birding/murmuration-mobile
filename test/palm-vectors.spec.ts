import { showDebug } from './fixtures/debug'
import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'
import { fakeOrientation } from './fixtures/orientation'

for (const facing of ['environment', 'user'] as const) {
  test(`palm and gravity vectors share an anchor and respond to tilt: ${facing}`, async ({ page }) => {
    await archive(page)
    await fakeOrientation(page)
    await fakeCamera(page, '/__test__/palm.jpg', { x: 0, y: 550, width: 400, height: 300 })
    await page.route('**/__test__/palm.jpg', route => route.fulfill({ path: 'test/fixtures/open-palm.jpg', contentType: 'image/jpeg' }))
    const models: string[] = []
    page.on('request', request => { if (request.url().includes('.fbx')) models.push(request.url()) })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/entries/?id=${id}`)
    await page.evaluate(facing => { window.cameraTest.facing = facing }, facing)
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    await showDebug(page)
    const normal = page.locator('[data-vector=normal]'), up = page.locator('[data-vector=up]')
    await expect(normal).toBeVisible({ timeout: 40_000 })
    await expect(up).toBeVisible()
    expect(await normal.evaluate(element => element.parentElement === document.querySelector('[data-vector=up]')?.parentElement)).toBe(true)
    const initialUp = await page.locator('[data-metric=up]').textContent()
    await page.evaluate(() => { window.orientationTest.beta = 90 })
    await expect(up.locator('path').first()).toHaveAttribute('d', /M0 0L/)
    await expect(page.locator('[data-metric=up]')).not.toHaveText(initialUp!)
    await expect(normal).toBeVisible()
    await expect(page.locator('.interactive-bird')).toHaveAttribute('data-state', 'hovering', { timeout: 15000 })
    await page.screenshot({ path: `.qa/palm-vectors-${facing}.png` })
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.locator('.entry-track')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -780)')
    await page.evaluate(() => { window.orientationTest.angle = 90; screen.orientation.dispatchEvent(new Event('change')) })
    await expect(page.locator('[data-metric=up]')).toHaveText(/1\.00.*0\.00/)
    await expect(normal).toBeVisible()
    await page.screenshot({ path: `.qa/palm-vectors-landscape-${facing}.png` })
    await page.evaluate(() => { window.cameraTest.showImage = false })
    await expect(normal).toBeHidden()
    await expect(up).toBeHidden()
    await expect(page.locator('[data-metric=normal]')).toHaveText('—')
    await expect(page.locator('.interactive-bird')).toHaveAttribute('data-state', 'hidden')
    expect(models.length).toBeGreaterThan(0)
    await page.getByRole('tab', { name: '3D View', exact: true }).click()
    await expect(page.locator('.palm-vectors')).toHaveCount(0)
    await expect(page.locator('.interactive-bird')).toHaveCount(0)
    await expect(page.locator('.bird-preview')).toHaveAttribute('data-state', 'ready')
    expect(models.length).toBeGreaterThan(0)
  })
}
