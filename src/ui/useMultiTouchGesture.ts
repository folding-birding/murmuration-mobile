import { useEffect, type RefObject } from 'react'

export function useMultiTouchGesture(surface: RefObject<HTMLElement | null>, fingers: number, onGesture: () => void) {
  useEffect(() => {
    const element = surface.current
    if (!element) return
    const active = new Set<number>()
    let latched = false
    const start = (event: TouchEvent) => {
      for (const touch of event.changedTouches) {
        if (touch.target instanceof Node && element.contains(touch.target)) active.add(touch.identifier)
      }
      if (active.size >= 2) event.preventDefault()
      if (active.size < fingers || latched) return
      latched = true
      onGesture()
    }
    const release = (event: TouchEvent) => {
      for (const touch of event.changedTouches) active.delete(touch.identifier)
      if (active.size === 0) latched = false
    }
    element.addEventListener('touchstart', start, { passive: false })
    element.addEventListener('touchend', release)
    element.addEventListener('touchcancel', release)
    return () => {
      element.removeEventListener('touchstart', start)
      element.removeEventListener('touchend', release)
      element.removeEventListener('touchcancel', release)
    }
  }, [surface, fingers, onGesture])
}
