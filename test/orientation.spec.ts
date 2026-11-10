import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'

test.use({ hasTouch: true, isMobile: true })

for (const direction of ['landscape-primary', 'landscape-secondary'] as const) {
  test(`${direction} uses side rails with an upright logo at the top`, async ({ page }) => {
    await page.setViewportSize({ width: 568, height: 320 })
    await page.addInitScript(direction => {
      Object.defineProperty(screen.orientation, 'type', { configurable: true, get: () => direction })
    }, direction)
    await archive(page)
    await page.goto(`/entries/?id=${id}`)
    await page.getByRole('tab', { name: '3D View', exact: true }).click()
    await expect(page.locator('.bird-preview')).toHaveAttribute('data-state', 'ready')
    const reversed = direction === 'landscape-secondary'
    expect(await page.locator('.entry-header').boundingBox()).toEqual({ x: reversed ? 508 : 0, y: 0, width: 60, height: 320 })
    expect(await page.locator('.entry-viewport').boundingBox()).toEqual({ x: 60, y: 0, width: 448, height: 320 })
    expect(await page.locator('.entry-footer').boundingBox()).toEqual({ x: reversed ? 0 : 508, y: 0, width: 60, height: 320 })
    expect(await page.locator('.brand-mark img').boundingBox()).toEqual({ x: reversed ? 518 : 10, y: 10, width: 40, height: 40 })
    await expect(page.locator('.brand-mark img')).toHaveCSS('transform', 'none')
    expect(await page.locator('.download-button img').boundingBox()).toEqual({ x: reversed ? 518 : 10, y: 270, width: 40, height: 40 })
    await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    for (let index = 0; index < 2; index++) {
      expect(await page.locator('.slide-tabs img').nth(index).boundingBox()).toEqual({ x: reversed ? 24 : 532, y: 143 + index * 22, width: 12, height: 12 })
    }
    expect(await page.locator('.bird-preview').boundingBox()).toEqual({ x: 124, y: 0, width: 320, height: 320 })
    await page.screenshot({ path: `.qa/${direction}.png` })
    const session = await page.context().newCDPSession(page)
    const entry = page.locator('.bird-entry')
    async function swipe(x: number, y: number, endX: number, endY: number) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let step = 1; step <= 5; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (endX - x) * step / 5, y: y + (endY - y) * step / 5 }] })
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await swipe(90, 70, 90, 240)
    await expect(entry).toHaveAttribute('data-slide', '0')
    await expect(page.locator('.entry-track')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
    await swipe(430, 160, 140, 160)
    await expect(entry).toHaveAttribute('data-slide', '0')
    await swipe(284, 240, 284, 70)
    await expect(entry).toHaveAttribute('data-slide', '1')
    await expect(page.locator('.entry-track')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -320)')
    await expect(page.locator('.bird-preview')).toHaveAttribute('data-state', 'ready')
    await swipe(284, 70, 284, 240)
    await expect(entry).toHaveAttribute('data-slide', '1')
    await page.getByRole('tab', { name: 'QR', exact: true }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('tab', { name: '3D View', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('tab', { name: 'QR', exact: true })).toBeFocused()
    await page.setViewportSize({ width: 320, height: 568 })
    expect(await page.locator('.entry-header').boundingBox()).toEqual({ x: 0, y: 0, width: 320, height: 60 })
    expect(await page.locator('.brand-mark img').boundingBox()).toEqual({ x: 10, y: 10, width: 40, height: 40 })
    expect(await page.locator('.entry-footer').boundingBox()).toEqual({ x: 0, y: 508, width: 320, height: 60 })
    await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal')
    await swipe(160, 200, 160, 400)
    await expect(entry).toHaveAttribute('data-slide', '0')
    await swipe(250, 280, 70, 280)
    await expect(entry).toHaveAttribute('data-slide', '1')
    await expect(page.locator('.entry-track')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -320, 0)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight === innerHeight)).toBe(true)
  })
}
