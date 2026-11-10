import { useRef, type HTMLAttributes } from 'react'

export function useSwipeNavigation(axis: 'x' | 'y', onSwipe: (direction: -1 | 1) => void) {
  const swipe = useRef<{ id: number; x: number; y: number; axis: 'x' | 'y' } | null>(null)
  const cancel = () => { swipe.current = null }
  const handlers: HTMLAttributes<HTMLElement> = {
    onPointerDown(event) {
      if (!event.isPrimary || event.button !== 0) { cancel(); return }
      if ((event.target as Element).closest('.bird-preview, button, a')) return
      swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerUp(event) {
      const start = swipe.current
      cancel()
      if (!start || start.id !== event.pointerId) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      if (start.axis !== axis) return
      const dx = event.clientX - start.x, dy = event.clientY - start.y
      const distance = axis === 'x' ? dx : dy
      const crossDistance = axis === 'x' ? dy : dx
      if (Math.abs(distance) >= 45 && Math.abs(distance) > Math.abs(crossDistance) * 1.5) onSwipe(distance < 0 ? 1 : -1)
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
  }
  return handlers
}
