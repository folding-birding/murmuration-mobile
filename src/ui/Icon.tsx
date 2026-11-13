type IconName = 'retry' | 'warning'

export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'retry' && <><path d="M20 10a8 8 0 1 0-1 7M20 3v7h-7" /></>}
    {name === 'warning' && <><path d="m12 3 10 18H2Z" /><path d="M12 9v5m0 3h.01" /></>}
  </svg>
}
