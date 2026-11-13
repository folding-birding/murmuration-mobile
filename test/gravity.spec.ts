import { showDebug } from './fixtures/debug'
import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'
import { fakeOrientation } from './fixtures/orientation'

for (const permission of ['granted', 'denied'] as const) {
  test(`orientation permission is requested on a gesture: ${permission}`, async ({ page }) => {
    await archive(page)
    await fakeCamera(page)
    await fakeOrientation(page, true)
    await page.goto(`/entries/?id=${id}`)
    await page.evaluate(permission => { window.orientationTest.permission = permission }, permission)
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Enable motion access' })
    await expect(dialog).toHaveAttribute('data-state', 'permission')
    await expect(page.locator('.debug-frame')).toHaveCount(0)
    expect(await page.evaluate(() => window.orientationTest.requests)).toBe(0)
    await page.getByRole('button', { name: 'Allow', exact: true }).click()
    if (permission === 'granted') {
      await expect(dialog).toHaveCount(0)
      await expect(page.locator('.gravity-status')).toHaveCount(0)
    } else {
      await expect(dialog).toHaveAttribute('data-state', 'denied')
      await dialog.getByRole('button', { name: 'No', exact: true }).click()
      await expect(dialog).toHaveCount(0)
    }
    expect(await page.evaluate(() => window.orientationTest.requests)).toBe(1)
    await page.getByRole('tab', { name: 'QR', exact: true }).click()
    await expect(page.locator('.gravity-status')).toHaveCount(0)
    await expect.poll(() => page.workers().length).toBe(0)
  })
}

test('existing orientation permission does not require another gesture', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page, true)
  await page.goto(`/entries/?id=${id}`)
  await page.evaluate(() => { window.orientationTest.enabled = true })
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  await showDebug(page)
  await expect(page.locator('.hand-overlay')).toBeAttached()
  await expect(page.locator('.gravity-status')).toHaveCount(0)
  expect(await page.evaluate(() => window.orientationTest.requests)).toBe(0)
  await expect(page.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(0)
})

test('orientation values remain available when hand tracking fails', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page)
  await page.route('**/*.task*', route => route.abort())
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  await showDebug(page)
  await expect(page.locator('.hand-overlay')).toHaveAttribute('data-state', 'failed', { timeout: 40000 })
  await expect(page.locator('[data-metric=up]')).toHaveText(/[+-]\d\.\d{2}/)
  const previous = await page.locator('[data-metric=up]').textContent()
  await page.evaluate(() => { window.orientationTest.beta = 90 })
  await expect(page.locator('[data-metric=up]')).not.toHaveText(previous!)
})

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`motion permission matches Figma and No preserves camera access: ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await archive(page)
    await fakeCamera(page)
    await fakeOrientation(page, true)
    await page.goto(`/entries/?id=${id}`)
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Enable motion access' })
    await expect(dialog).toBeVisible()
    await expect.poll(() => page.locator('.entry-track').evaluate(element => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
      return Math.round(innerWidth > innerHeight ? matrix.m42 : matrix.m41)
    })).toBe(-640)
    await page.evaluate(() => document.fonts.ready)
    const box = await dialog.boundingBox()
    expect(box).toEqual({ x: (viewport.width - 256) / 2, y: (viewport.height - 96) / 2, width: 256, height: 96 })
    expect(await dialog.evaluate(element => {
      const style = getComputedStyle(element)
      return { color: style.backgroundColor, radius: style.borderRadius }
    })).toEqual({ color: 'rgb(227, 230, 235)', radius: '16px' })
    for (const name of ['No', 'Allow']) {
      const button = dialog.getByRole('button', { name, exact: true })
      const rect = await button.boundingBox()
      expect(rect?.width).toBe(96)
      expect(rect?.height).toBe(24)
    }
    await expect(page.locator('.entry-header img')).toHaveCount(0)
    await expect(page.locator('.slide-tabs img')).toHaveCount(3)
    for (const dot of await page.locator('.slide-tabs img').all()) {
      expect(await dot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 12 && img.getBoundingClientRect().width === 12 && img.getBoundingClientRect().height === 12)).toBe(true)
    }
    await page.screenshot({ path: `.qa/motion-permission-${viewport.width}.png` })
    await dialog.getByRole('button', { name: 'No', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(await page.evaluate(() => window.orientationTest.requests)).toBe(0)
    await expect(page.locator('.camera-view')).toHaveAttribute('data-state', 'ready')
    await page.getByRole('tab', { name: 'QR', exact: true }).click()
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    await expect(dialog).toBeVisible()
  })
}

test('environments without a permission API never show a motion prompt', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page)
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  await expect(page.locator('.camera-view')).toHaveAttribute('data-state', 'ready')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.gravity-status')).toHaveCount(0)
  expect(await page.evaluate(() => window.orientationTest.requests)).toBe(0)
})

test('a pending browser permission request cannot be submitted twice', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page, true)
  await page.goto(`/entries/?id=${id}`)
  await page.evaluate(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { value: () => {
      window.orientationTest.requests++
      return new Promise(() => {})
    } })
  })
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Enable motion access' })
  await dialog.getByRole('button', { name: 'Allow', exact: true }).click()
  await expect(dialog).toHaveAttribute('aria-busy', 'true')
  await expect(dialog.getByRole('button', { name: 'Allow', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'No', exact: true })).toBeDisabled()
  expect(await page.evaluate(() => window.orientationTest.requests)).toBe(1)
  await page.getByRole('tab', { name: 'QR', exact: true }).click()
  await expect(dialog).toHaveCount(0)
})
