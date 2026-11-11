import type { Page } from '@playwright/test'
import type { HandFrame } from '../../src/camera/hand/types'

declare global { interface Window { handTest: { frame: HandFrame | null } } }

export async function fakeHandTracker(page: Page, frame: HandFrame) {
  await page.addInitScript(frame => {
    window.handTest = { frame }
    class Tracker {
      onmessage: ((event: { data: object }) => void) | null = null
      onerror = null
      onmessageerror = null
      stopped = false
      postMessage(message: { type: string; delegate?: string; frame?: ImageBitmap }) {
        message.frame?.close()
        setTimeout(() => {
          if (this.stopped) return
          this.onmessage?.({ data: message.type === 'init' ? { type: 'ready', delegate: message.delegate }
            : { type: 'result', inferenceMs: 10, ...(window.handTest.frame ?? {landmarks:[],worldLandmarks:[],handedness:[]}) } })
        }, 10)
      }
      terminate() { this.stopped = true }
    }
    window.Worker = Tracker as unknown as typeof Worker
  }, frame)
}
