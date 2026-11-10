import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'

for (const orientation of ['portrait', 'landscape-primary', 'landscape-secondary'] as const) {
  test(`AR design keeps dark rails and contrasting pagination: ${orientation}`, async ({ page }) => {
    const portrait = orientation === 'portrait'
    const reversed = orientation === 'landscape-secondary'
    await page.setViewportSize(portrait ? { width: 320, height: 568 } : { width: 568, height: 320 })
    await page.addInitScript(orientation => {
      Object.defineProperty(screen.orientation, 'type', { configurable: true, get: () => orientation })
    }, orientation)
    await archive(page)
    await fakeCamera(page)
    await page.goto(`/entries/?id=${id}`)
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    await expect(page.locator('.camera-view')).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('.entry-track')).toHaveCSS('transform', portrait ? 'matrix(1, 0, 0, 1, -640, 0)' : 'matrix(1, 0, 0, 1, 0, -640)')
    await expect(page.locator('.bird-entry')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(page.locator('.entry-header > *')).toHaveCount(0)
    await expect(page.locator('.download-button, .brand-mark')).toHaveCount(0)
    expect(await page.locator('.entry-header').boundingBox()).toEqual(portrait
      ? { x: 0, y: 0, width: 320, height: 60 }
      : { x: reversed ? 508 : 0, y: 0, width: 60, height: 320 })
    expect(await page.locator('.entry-footer').boundingBox()).toEqual(portrait
      ? { x: 0, y: 508, width: 320, height: 60 }
      : { x: reversed ? 0 : 508, y: 0, width: 60, height: 320 })
    for (let index = 0; index < 3; index++) {
      const dot = page.locator('.slide-tabs img').nth(index)
      expect(await dot.boundingBox()).toEqual(portrait
        ? { x: 132 + index * 22, y: 532, width: 12, height: 12 }
        : { x: reversed ? 24 : 532, y: 132 + index * 22, width: 12, height: 12 })
      const color = await dot.evaluate(async (element: HTMLImageElement) => {
        await element.decode()
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 12
        const context = canvas.getContext('2d')!
        context.drawImage(element, 0, 0, 12, 12)
        return [...context.getImageData(6, 6, 1, 1).data]
      })
      expect(color).toEqual(index === 2 ? [255, 255, 255, 255] : [110, 118, 134, 255])
    }
    await page.screenshot({ path: `.qa/ar-design-${orientation}.png` })
    await page.getByRole('tab', { name: 'QR', exact: true }).click()
    await expect(page.locator('.bird-entry')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(page.locator('.brand-mark')).toBeVisible()
    await expect(page.locator('.download-button')).toBeVisible()
    await page.getByRole('tab', { name: '3D View', exact: true }).click()
    await expect(page.locator('.brand-mark')).toBeVisible()
    await expect(page.locator('.download-button')).toBeVisible()
  })
}
