import { useEffect, useRef, type ReactNode } from 'react'
import type { Vector3 } from '../coordinates'
import './debug.css'

export interface DebugVector { name: string; symbol: string; label: string; color: string; dashed?: boolean }
export interface DebugVectorFrame {
  anchor: { x: number; y: number } | null
  values: (Vector3 | null)[]
}

export function VectorOverlay({ vectors, readFrame, mirrored, header, className = '' }: {
  vectors: readonly DebugVector[]; readFrame: (width: number, height: number, time: number) => DebugVectorFrame
  mirrored: boolean; header?: ReactNode; className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = root.current!
    const anchor = element.querySelector<SVGGElement>('[data-anchor]')!
    const parts = vectors.map(({ name }) => ({
      group: element.querySelector<SVGGElement>(`[data-vector="${name}"]`)!,
      arrow: element.querySelector<SVGPathElement>(`[data-vector="${name}"] path`)!,
      depth: element.querySelector<SVGGElement>(`[data-vector="${name}"] [data-depth]`)!,
      toward: element.querySelector<SVGElement>(`[data-vector="${name}"] [data-toward]`)!,
      away: element.querySelector<SVGElement>(`[data-vector="${name}"] [data-away]`)!,
      label: element.querySelector<SVGTextElement>(`[data-vector="${name}"] text`)!,
      value: element.querySelector<HTMLElement>(`[data-metric="${name}"]`)!,
    }))
    let frame = 0
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw)
      const width = element.clientWidth, height = element.clientHeight
      const sample = readFrame(width, height, time)
      anchor.style.display = sample.anchor ? '' : 'none'
      if (sample.anchor) anchor.setAttribute('transform', `translate(${sample.anchor.x} ${sample.anchor.y})`)
      const length = Math.max(60, Math.min(120, Math.min(width, height) * 0.24))
      parts.forEach((part, index) => {
        const value = sample.values[index]
        part.group.style.display = sample.anchor && value ? '' : 'none'
        part.value.textContent = value ? [value.x, value.y, value.z].map(n => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`).join('  ') : '—'
        if (!value || !sample.anchor) return
        const x = value.x * length * (mirrored ? -1 : 1), y = value.y * length
        const projectedLength = Math.hypot(x, y)
        const ux = x / (projectedLength || 1), uy = y / (projectedLength || 1)
        part.arrow.setAttribute('d', projectedLength < 8 ? '' : `M0 0L${x} ${y}M${x - ux * 10 - uy * 5} ${y - uy * 10 + ux * 5}L${x} ${y}L${x - ux * 10 + uy * 5} ${y - uy * 10 - ux * 5}`)
        part.depth.setAttribute('transform', `translate(${x} ${y})`)
        part.depth.style.display = Math.abs(value.z) > 0.3 ? '' : 'none'
        part.toward.style.display = value.z < 0 ? '' : 'none'
        part.away.style.display = value.z > 0 ? '' : 'none'
        part.label.setAttribute('x', String(x + 12))
        part.label.setAttribute('y', String(y + (vectors[index].dashed ? 22 : -12)))
      })
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [vectors, readFrame, mirrored])
  return <div ref={root} className={`debug-vectors ${className}`}>
    <svg className="debug-vector-overlay" aria-hidden="true">
      <g data-anchor="" style={{ display: 'none' }}>
        <circle r="4" fill="var(--palette-white)" />
        {vectors.map(({ name, symbol, color, dashed }) => <g key={name} data-vector={name} style={{ color }}>
          <path fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={dashed ? '6 4' : undefined} />
          <g data-depth=""><circle r="7" fill="var(--palette-ink)" stroke="currentColor" strokeWidth="4" />
            <circle data-toward="" r="2.5" fill="currentColor" />
            <path data-away="" d="M-3-3L3 3M-3 3L3-3" stroke="currentColor" strokeWidth="4" />
          </g>
          <text fill="currentColor" stroke="var(--palette-ink)" strokeWidth="3" paintOrder="stroke">{symbol}</text>
        </g>)}
      </g>
    </svg>
    <div className="vector-debug" aria-live="off">
      {header}
      {vectors.map(({ name, symbol, label, color }) => <div key={name}>
        <div style={{ color }}>{symbol} · {label}</div><div data-metric={name}>—</div>
      </div>)}
    </div>
  </div>
}
