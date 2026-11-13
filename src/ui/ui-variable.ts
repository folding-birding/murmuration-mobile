export const uiVariables = {
  'palette/black': '#000000',
  'palette/white': '#ffffff',
  'palette/blue': '#63b4ff',
  'palette/ink': '#1a1c1f',
  'palette/natural': '#f6f7f9',
  'palette/gray': '#6e7686',
  'palette/ligihtgray': '#e3e6eb',
  'radius/4': '4px',
  'radius/16': '16px',
  'radius/20': '20px',
  'typography/font-size/18': '18px',
  'font-family': 'Pretendard, sans-serif',
} as const

export const trackingDebugFontSize = '12px'

export function applyUiVariables() {
  document.documentElement.style.setProperty('--tracking-debug-font-size', trackingDebugFontSize)
  for (const [key, value] of Object.entries(uiVariables)) {
    document.documentElement.style.setProperty(`--${key.replaceAll('/', '-')}`, value)
  }
}

export const trackingDebugColors = { normal: '#ff3b30', up: '#2979ff', accepted: '#ffcc00' } as const
