import { test, expect } from '@playwright/test'
import { archive, id } from './fixtures/archive'
import { fakeCamera } from './fixtures/camera'
import { fakeOrientation } from './fixtures/orientation'
import { fakeHandTracker } from './fixtures/hand-tracker'
import { openHand } from './fixtures/open-hand'

for (const side of ['Right','Left'] as const) {
  test(`textured bird arrives, follows and leaves for ${side} palm`, async ({ page }) => {
    await archive(page)
    await fakeCamera(page)
    await fakeOrientation(page)
    const frame = openHand(side)
    await fakeHandTracker(page, frame)
    await page.setViewportSize({width:390,height:844})
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`/entries/?id=${id}`)
    await page.evaluate(side => {window.orientationTest.beta=90; window.cameraTest.facing=side==='Left'?'user':'environment'},side)
    await page.getByRole('tab',{name:'AR',exact:true}).click()
    const bird=page.locator('.interactive-bird')
    await expect(bird).toHaveAttribute('data-state','hidden')
    await expect(bird).toHaveAttribute('data-state','arriving',{timeout:15000})
    await expect(bird).toHaveAttribute('data-side',side)
    await expect(bird).toHaveAttribute('data-model','ready')
    await expect(bird).toHaveAttribute('data-state','hovering')
    await expect(bird).toBeVisible()
    const original=(await bird.boundingBox())!
    await page.evaluate(() => {window.handTest.frame!.landmarks[0].forEach(p=>{p.x+=.06})})
    await expect.poll(async()=>Math.abs((await bird.boundingBox())!.x-original.x)).toBeGreaterThan(20)
    const hovered=(await bird.boundingBox())!
    expect(hovered.y).toBeGreaterThan(0)
    await page.screenshot({path:`.qa/interactive-bird-${side}.png`})
    await page.evaluate(() => {window.handTest.frame=null})
    await page.waitForTimeout(400)
    await expect(bird).toHaveAttribute('data-state','hovering')
    const folded=structuredClone(frame)
    for (const tip of [4,8,12,16,20]) {
      folded.landmarks[0][tip] = {...folded.landmarks[0][tip-3]}
      folded.worldLandmarks[0][tip] = {...folded.worldLandmarks[0][tip-3]}
    }
    await page.evaluate(frame=>{window.handTest.frame=frame},folded)
    await page.waitForTimeout(1200)
    await expect(bird).toHaveAttribute('data-state','hovering')
    await page.evaluate(() => {window.handTest.frame=null})
    await expect(bird).toHaveAttribute('data-state','leaving')
    const start = (await bird.boundingBox())!
    await page.waitForTimeout(200)
    const leaving = (await bird.boundingBox())!
    expect(leaving.x).toBeCloseTo(start.x, 1)
    expect(leaving.y).toBeLessThan(start.y)
    await page.screenshot({path:`.qa/interactive-bird-departure-${side}.png`})
    await expect(bird).toHaveAttribute('data-state','hidden')
    await expect(bird).toBeHidden()
    await page.evaluate(frame=>{window.handTest.frame=frame},frame)
    await expect(bird).toHaveAttribute('data-state','hovering')
    await page.setViewportSize({width:844,height:390})
    await page.evaluate(()=>{window.orientationTest.angle=90; screen.orientation.dispatchEvent(new Event('change'))})
    await expect(bird).toHaveAttribute('data-state','hovering')
    await page.getByRole('tab',{name:'3D View',exact:true}).click()
    await expect(bird).toHaveCount(0)
    await expect(page.locator('.bird-preview')).toHaveAttribute('data-state','ready')
    expect(errors).toEqual([])
  })
}

test('bird loading failure can be retried without interrupting tracking',async({page})=>{
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page)
  await fakeHandTracker(page,openHand())
  let fail=true
  await page.route('**/*.fbx',route=>fail?route.abort():route.continue())
  await page.goto(`/entries/?id=${id}`)
  await page.evaluate(()=>{window.orientationTest.beta=90})
  await page.getByRole('tab',{name:'AR',exact:true}).click()
  await expect(page.locator('.interactive-bird')).toHaveAttribute('data-model','failed')
  await expect(page.locator('.hand-overlay')).toHaveAttribute('data-hands','1')
  await expect(page.locator('video')).toHaveJSProperty('paused',false)
  fail=false
  await page.getByRole('button',{name:'Reload 3D view'}).click()
  await expect(page.locator('.interactive-bird')).toHaveAttribute('data-state','hovering')
})

test('depth-aligned gravity fades the bird without inventing sideways movement', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page)
  await fakeHandTracker(page, openHand())
  await page.goto(`/entries/?id=${id}`)
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  const bird = page.locator('.interactive-bird')
  await expect(bird).toHaveAttribute('data-state', 'hovering')
  const before = (await bird.boundingBox())!
  const samples = await page.evaluate(() => {
    window.handTest.frame = null
    const element = document.querySelector<HTMLElement>('.interactive-bird')!
    const frames: { x: number; y: number; opacity: number }[] = []
    const started = performance.now()
    return new Promise<typeof frames>((resolve, reject) => {
      const tick = () => {
        if (element.dataset.state === 'leaving') {
          const { x, y } = element.getBoundingClientRect()
          frames.push({ x, y, opacity: Number(element.style.opacity) })
        }
        if (element.dataset.state === 'hidden') { resolve(frames); return }
        if (performance.now() - started > 6000) { reject(new Error('Departure did not finish')); return }
        requestAnimationFrame(tick)
      }
      tick()
    })
  })
  expect(samples.length).toBeGreaterThan(2)
  expect(samples.some(frame => frame.opacity < .2)).toBe(true)
  for (const frame of samples) {
    expect(frame.x).toBeCloseTo(before.x, 1)
    expect(frame.y).toBeCloseTo(before.y, 1)
  }
})

test('a tracked skeleton keeps the bird present through missing normal or handedness', async ({ page }) => {
  await archive(page)
  await fakeCamera(page)
  await fakeOrientation(page)
  const frame = openHand()
  await fakeHandTracker(page, frame)
  await page.goto(`/entries/?id=${id}`)
  await page.evaluate(() => { window.orientationTest.beta = 90 })
  await page.getByRole('tab', { name: 'AR', exact: true }).click()
  const bird = page.locator('.interactive-bird')
  await expect(bird).toHaveAttribute('data-state', 'hovering')
  const uncertain = structuredClone(frame)
  uncertain.handedness[0][0].score = 0.55
  uncertain.landmarks[0].forEach(p => { p.x += 0.06 })
  const original = (await bird.boundingBox())!
  await page.evaluate(frame => { window.handTest.frame = frame }, uncertain)
  await expect(page.locator('[data-vector=normal]')).toBeVisible()
  await expect(page.locator('[data-gesture=open]')).toBeVisible()
  await expect.poll(async () => Math.abs((await bird.boundingBox())!.x - original.x)).toBeGreaterThan(20)
  await page.waitForTimeout(1300)
  await expect(bird).toHaveAttribute('data-state', 'hovering')
  const missingLabel = structuredClone(frame); missingLabel.handedness = []
  const missingDepth = structuredClone(frame); missingDepth.worldLandmarks = []
  for (const incomplete of [missingLabel, missingDepth]) {
    await page.evaluate(frame => { window.handTest.frame = frame }, incomplete)
    await expect(page.locator('.hand-overlay')).toHaveAttribute('data-hands', '1')
    if (incomplete.worldLandmarks.length) await expect(page.locator('[data-vector=normal]')).toBeVisible()
    else await expect(page.locator('[data-vector=normal]')).toBeHidden()
    await page.waitForTimeout(1300)
    await expect(bird).toHaveAttribute('data-state', 'hovering')
    await expect(bird).toBeVisible()
  }
  await page.evaluate(() => { window.handTest.frame = null })
  await expect(bird).toHaveAttribute('data-state', 'leaving')
  await expect(bird).toHaveAttribute('data-state', 'hidden')
})
