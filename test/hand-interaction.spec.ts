import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'
import { fakeOrientation } from './fixtures/orientation'
import { fakeHandTracker } from './fixtures/hand-tracker'
import { openHand } from './fixtures/open-hand'

for (const facing of ['environment', 'user'] as const) {
  test(`accepted gesture has a yellow center below both vectors: ${facing}`, async ({ page }) => {
    await archive(page)
    await fakeCamera(page)
    await fakeOrientation(page)
    const frame = openHand()
    await fakeHandTracker(page, frame)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/entries/?id=${id}`)
    await page.evaluate(facing => { window.cameraTest.facing = facing; window.orientationTest.beta = 90 }, facing)
    await page.getByRole('tab', { name: 'AR', exact: true }).click()
    const debug = page.locator('.debug-frame')
    await expect(debug).toHaveCount(1)
    for (const selector of ['.hand-overlay', '.tracking-debug', '.vector-debug', '[data-gesture=open]', '[data-vector=normal]', '[data-vector=up]']) {
      await expect(debug.locator(selector)).toHaveCount(1)
    }
    expect(await debug.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none')
    const marker = page.locator('[data-gesture=open]')
    await expect(marker).toBeVisible()
    await expect(marker).toHaveAttribute('fill', '#ffcc00')
    await expect(page.locator('.vector-debug')).toHaveCSS('font-size', '12px')
    for (const name of ['normal', 'up']) {
      const vector = page.locator(`[data-vector=${name}]`)
      await expect(vector).toBeVisible()
      expect(await vector.evaluate(element => {
        const marker = document.querySelector('[data-gesture=open]')!
        return marker.parentElement === element.parentElement
          && !!(marker.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
      })).toBe(true)
    }
    await page.screenshot({ path: `.qa/hand-interaction-${facing}.png` })
    const folded = structuredClone(frame)
    folded.worldLandmarks[0][20] = { ...folded.worldLandmarks[0][17] }
    await page.evaluate(frame => { window.handTest.frame = frame }, folded)
    await expect(marker).toBeHidden()
    const back = structuredClone(frame)
    back.handedness[0][0].categoryName = 'Left'
    await page.evaluate(frame => { window.handTest.frame = frame }, back)
    await expect(marker).toBeHidden()
    await page.evaluate(frame => { window.handTest.frame = frame }, frame)
    await expect(marker).toBeVisible()
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(marker).toBeVisible()
    await page.evaluate(() => { window.handTest.frame = null })
    await expect(marker).toBeHidden()
    await expect(page.locator('[data-vector=normal]')).toBeHidden()
  })
}

test('missing sensor data leaves the palm normal visible without fabricating gravity', async ({ page }) => {
  await archive(page)
  await fakeCamera(page, '/__test__/palm.jpg', { x: 0, y: 550, width: 400, height: 300 })
  await fakeOrientation(page)
  await page.route('**/__test__/palm.jpg', route => route.fulfill({ path: 'test/fixtures/open-palm.jpg', contentType: 'image/jpeg' }))
  await page.goto(`/entries/?id=${id}`)
  await page.evaluate(() => { window.orientationTest.enabled = false })
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  await expect(page.locator('.hand-overlay')).toHaveAttribute('data-hands', '1', { timeout: 40_000 })
  await expect(page.locator('.gravity-status')).toHaveAttribute('data-state', 'unavailable', { timeout: 6000 })
  await expect(page.locator('[data-vector=normal]')).toBeVisible()
  await expect(page.locator('[data-vector=up]')).toBeHidden()
  await expect(page.locator('[data-metric=up]')).toHaveText('—')
  await page.evaluate(() => { window.orientationTest.enabled = true })
  await expect(page.locator('[data-vector=up]')).toBeVisible()
  await expect(page.locator('[data-metric=up]')).toHaveText(/[+-]\d\.\d{2}/)
})


test('normal, gesture and Hand label share the accepted side through classification spikes', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page)
  const right = openHand()
  await fakeHandTracker(page, right)
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  const side = page.locator('[data-metric=handedness]')
  const normal = page.locator('[data-metric=normal]')
  const marker = page.locator('[data-gesture=open]')
  await expect(side).toHaveText('Right')
  await expect(marker).toBeVisible()
  const initial = await normal.textContent()
  const flipped = structuredClone(right)
  flipped.handedness[0][0].categoryName = 'Left'
  await page.evaluate(frame => { window.handTest.frame = frame }, flipped)
  await page.waitForTimeout(300)
  await expect(side).toHaveText('Right')
  await expect(normal).toHaveText(initial!)
  await expect(marker).toBeVisible()
  flipped.handedness[0][0].score = .55
  await page.evaluate(frame => { window.handTest.frame = frame }, flipped)
  await page.waitForTimeout(1000)
  await expect(side).toHaveText('Right')
  await expect(normal).toHaveText(initial!)
  await expect(marker).toBeVisible()
  flipped.handedness = []
  await page.evaluate(frame => { window.handTest.frame = frame }, flipped)
  await page.waitForTimeout(1000)
  await expect(side).toHaveText('Right')
  await expect(normal).toHaveText(initial!)
  await expect(marker).toBeVisible()
  await page.evaluate(frame => { window.handTest.frame = frame }, openHand('Left'))
  await expect(side).toHaveText('Left')
  await expect(marker).toBeVisible()
  await expect(page.locator('[data-vector=normal]')).toBeVisible()
})
