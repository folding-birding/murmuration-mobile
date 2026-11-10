import { useRef, type HTMLAttributes } from 'react'

export function useSwipeNavigation(onSwipe: (direction: -1 | 1) => void) {
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const cancel = () => { swipe.current = null }
  const handlers: HTMLAttributes<HTMLElement> = {
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0) { cancel(); return }
      if ((event.target as Element).closest('.bird-preview, button, a')) return
      swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerUp(event) {
      const start = swipe.current
      cancel()
      if (!start || start.id !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      const dx = event.clientX - start.x, dy = event.clientY - start.y
      if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1)
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
  }
  return handlers
}
