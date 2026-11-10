import type { Page } from '@playwright/test'

declare global {
  interface Window {
    cameraTest: {
      mode: 'ready' | 'denied' | 'missing' | 'pending'
      facing: 'environment' | 'user'
      calls: MediaStreamConstraints[]
      streams: MediaStream[]
      resolve?: () => void
    }
  }
}

export async function fakeCamera(page: Page) {
  await page.addInitScript(() => {
    const state: Window['cameraTest'] = { mode: 'ready', facing: 'environment', calls: [], streams: [] }
    const pending: (() => void)[] = []
    state.resolve = () => pending.splice(0).forEach(resolve => resolve())
    window.cameraTest = state
    navigator.mediaDevices.getUserMedia = async constraints => {
      state.calls.push(constraints ?? {})
      if (state.mode === 'denied') throw new DOMException('Test permission denial', 'NotAllowedError')
      if (state.mode === 'missing') throw new DOMException('Test missing camera', 'NotFoundError')
      if (state.mode === 'pending') await new Promise<void>(resolve => { pending.push(resolve) })
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const context = canvas.getContext('2d')!
      const draw = () => {
        context.fillStyle = '#adbeb9'
        context.fillRect(0, 0, 640, 480)
        context.fillStyle = '#4a7063'
        context.fillRect(0, 320, 640, 160)
      }
      draw()
      const stream = canvas.captureStream(10)
      const track = stream.getVideoTracks()[0]
      const settings = track.getSettings.bind(track)
      track.getSettings = () => ({ ...settings(), facingMode: state.facing })
      const timer = window.setInterval(draw, 100)
      const stop = track.stop.bind(track)
      track.stop = () => { clearInterval(timer); stop() }
      state.streams.push(stream)
      return stream
    }
  })
}
