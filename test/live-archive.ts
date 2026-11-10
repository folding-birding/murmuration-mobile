import { test, expect } from '@playwright/test'

test('published R2 entry renders, plays, and returns to lookup', async ({ page, request, isMobile }, testInfo) => {
  const config = await (await request.get('/site-config.json')).json()
  const manifestResponse = await request.get(`${config.r2BaseUrl}/entries/manifest.json`)
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json() as { id: string; guid: string }[]
  const entry = process.env.LIVE_ARCHIVE_ID ? manifest.find(row => row.id === process.env.LIVE_ARCHIVE_ID) : manifest[0]
  expect(entry, 'Upload a completed bird before running the live test').toBeTruthy()
  const id = entry!.id
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`) })
  const failures: string[] = []
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`) })

  await page.goto(`/entries/?id=${id}`)
  await expect(page.getByRole('heading', { name: id })).toBeVisible()
  const viewer = page.locator('.bird-preview')
  const qr = page.getByRole('img', { name: 'QR code for this bird' })
  await expect(qr).toBeVisible()
  await expect.poll(() => qr.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  await expect(qr).toHaveAttribute('src', new RegExp(`/entries/${id}/outputs/qr.svg\\?v=`))
  await qr.screenshot({ path: `.qa/live-${testInfo.project.name}-qr.png` })
  await page.getByRole('tab', { name: '3D View', exact: true }).click()
  await expect(viewer).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  const firstFrame = await viewer.screenshot()
  await page.waitForTimeout(300)
  expect(await viewer.screenshot()).not.toEqual(firstFrame)
  const yaw = await viewer.getAttribute('data-yaw')
  const bounds = (await viewer.boundingBox())!
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2
  if (isMobile) {
    const session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.touchscreen.tap(x, y)
    await page.touchscreen.tap(x, y)
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 60, y, { steps: 5 })
    await page.mouse.up()
    await viewer.dblclick()
  }
  await expect(viewer).not.toHaveAttribute('data-yaw', yaw!)
  await expect(page.locator('audio')).toHaveJSProperty('paused', false)
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0)
  await page.getByRole('tab', { name: 'QR', exact: true }).click()
  await expect(page.locator('audio')).toHaveJSProperty('paused', true)
  const audioData = await page.locator('audio').evaluate(async (audio: HTMLAudioElement) => {
    const data = await (await fetch(audio.src)).arrayBuffer()
    const context = new OfflineAudioContext(1, 1, 44100)
    const decoded = await context.decodeAudioData(data)
    const samples = decoded.getChannelData(0)
    let energy = 0
    for (const sample of samples) energy += sample * sample
    return { duration: decoded.duration, rms: Math.sqrt(energy / samples.length) }
  })
  expect(audioData.duration).toBeGreaterThan(0)
  expect(audioData.rms).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `.qa/live-${testInfo.project.name}.png`, fullPage: true })
  await testInfo.attach('live-entry', { body: JSON.stringify({ id, audio: audioData, failures, errors }, null, 2), contentType: 'application/json' })
  expect(failures).toEqual([])
  expect(errors).toEqual([])

  await page.getByRole('link', { name: 'Find another bird', exact: true }).first().click()
  await page.getByLabel('Bird ID', { exact: true }).fill(id)
  await page.getByRole('button', { name: 'Find my bird' }).click()
  await expect(page.getByRole('heading', { name: id })).toBeVisible()
  const missing = ['20000101000000', '20000101000001'].find(candidate => !manifest.some(row => row.id === candidate))!
  await page.goto(`/entries/?id=${missing}`)
  await expect(page).toHaveURL(/\/entries\/$/)
  await expect(page.getByLabel('Bird ID', { exact: true })).toBeVisible()
})
