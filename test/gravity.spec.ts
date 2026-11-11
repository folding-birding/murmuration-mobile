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
    await showDebug(page)
    await expect(page.locator('.gravity-status')).toHaveAttribute('data-state', 'permission')
    expect(await page.evaluate(() => window.orientationTest.requests)).toBe(0)
    await page.getByRole('button', { name: 'Enable orientation sensors' }).click()
    if (permission === 'granted') await expect(page.locator('.gravity-status')).toHaveCount(0)
    else await expect(page.locator('.gravity-status')).toHaveAttribute('data-state', 'denied')
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
  await expect(page.getByRole('button', { name: 'Enable orientation sensors' })).toHaveCount(0)
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
