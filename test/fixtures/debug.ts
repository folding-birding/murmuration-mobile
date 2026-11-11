import { expect, type Page } from '@playwright/test'

export async function showDebug(page: Page) {
  const camera = page.locator('.camera-view')
  await expect(camera).toHaveAttribute('data-state', 'ready')
  await camera.evaluate(element => {
    const touches = Array.from({ length: 4 }, (_, identifier) => new Touch({ identifier, target: element }))
    element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches, changedTouches: touches }))
    element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: touches }))
  })
  await expect(page.locator('.debug-frame')).toBeVisible()
}
