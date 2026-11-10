import { useEffect, useRef, useState } from 'react'

export function useBirdsong() {
  const ref = useRef<HTMLAudioElement>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const player = ref.current
    return () => player?.pause()
  }, [])

  const play = () => {
    if (!ref.current) return
    setError(false)
    ref.current.currentTime = 0
    void ref.current.play().catch(() => setError(true))
  }
  return {
    ref, error, play,
    pause: () => ref.current?.pause(),
    onError: () => setError(true),
  }
}
