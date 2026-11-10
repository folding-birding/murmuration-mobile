import { useEffect, useState } from 'react'

function readOrientation() {
  if (!window.matchMedia('(orientation: landscape)').matches) return 'portrait'
  const type = screen.orientation?.type
  const legacy = (window as Window & { orientation?: number }).orientation
  const reversed = type === 'landscape-secondary' || (!type?.startsWith('landscape') && legacy === -90)
  return reversed ? 'landscape-right' : 'landscape-left'
}

export function useOrientation() {
  const [value, setValue] = useState(readOrientation)
  useEffect(() => {
    const update = () => setValue(readOrientation())
    const media = window.matchMedia('(orientation: landscape)')
    media.addEventListener('change', update)
    screen.orientation?.addEventListener('change', update)
    window.addEventListener('orientationchange', update)
    update()
    return () => {
      media.removeEventListener('change', update)
      screen.orientation?.removeEventListener('change', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  return value
}
