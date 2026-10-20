// Todo se formatea fijo en Europe/Madrid: el server (Vercel, UTC) y el navegador
// deben dar el mismo texto, si no React da error de hidratación.
const TZ = 'Europe/Madrid'

const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

export function formatEUR(cents: number): string {
  return eur.format(cents / 100)
}

/** "1.234,50" o "1234.5" → céntimos. Devuelve null si no es un importe válido. */
export function parseEurosACents(valor: string): number | null {
  const limpio = valor.trim().replace(/\s|€/g, '')
  if (!limpio) return null
  // Si tiene coma, la coma es el decimal y los puntos son miles (formato es-ES).
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio
  const n = Number(normal)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsAEurosInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

/** Fecha de calendario (YYYY-MM-DD, sin hora) → "20 oct 2026". */
export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Hoy en Madrid como YYYY-MM-DD. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** Primer día del mes (YYYY-MM-01) desplazado `offset` meses desde el mes actual en Madrid. */
export function inicioDeMes(offset = 0, base = hoyISO()): string {
  const [y, m] = base.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + offset, 1))
  return d.toISOString().slice(0, 10)
}

export function nombreMes(inicio: string, largo = false): string {
  const [y, m] = inicio.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-ES', {
    month: largo ? 'long' : 'short',
    ...(largo ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

export function getContactoNombre(contact?: {
  name?: string
  contactName?: string
  firstName?: string
  lastName?: string
  companyName?: string
}): string {
  if (!contact) return '—'
  const persona =
    contact.name ??
    contact.contactName ??
    (`${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || undefined)
  return persona ?? contact.companyName ?? '—'
}

export function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}`
}
