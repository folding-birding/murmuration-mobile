import type { Page } from '@playwright/test'

declare global {
  interface Window {
    orientationTest: { beta: number; gamma: number; enabled: boolean; permission: 'granted' | 'denied'; requests: number; angle: number }
  }
}

export async function fakeOrientation(page: Page, permissionRequired = false) {
  await page.addInitScript(({ permissionRequired }) => {
    const state: Window['orientationTest'] = { beta: 0, gamma: 0, enabled: !permissionRequired, permission: 'granted', requests: 0, angle: 0 }
    window.orientationTest = state
    Object.defineProperty(screen.orientation, 'angle', { get: () => state.angle })
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { configurable: true, value: permissionRequired ? async () => {
      state.requests++
      state.enabled = state.permission === 'granted'
      return state.permission
    } : undefined })
    setInterval(() => {
      if (state.enabled) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: state.beta, gamma: state.gamma, alpha: null }))
    }, 100)
  }, { permissionRequired })
}
