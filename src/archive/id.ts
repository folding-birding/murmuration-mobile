export function validId(id: string): boolean {
  if (!/^[1-9]\d{13}$/.test(id)) return false
  const iso = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}T${id.slice(8, 10)}:${id.slice(10, 12)}:${id.slice(12, 14)}Z`
  const date = new Date(iso)
  return Number.isFinite(date.getTime()) && date.toISOString().replace(/\D/g, '').slice(0, 14) === id
}
