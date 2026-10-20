export function getIniciales(fullName: string): string {
  const partes = fullName.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}
