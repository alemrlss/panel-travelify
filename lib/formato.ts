// Todo se formatea fijo en Europe/Madrid: el server (Vercel, UTC) y el navegador
// deben dar el mismo texto, si no React da error de hidratación.
const TZ = 'Europe/Madrid'

const eurEntero = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})
const eurDecimal = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Sin decimales si el importe es redondo ("1.500 €"), si no siempre dos ("497,50 €"). */
export function formatEUR(cents: number): string {
  return (cents % 100 === 0 ? eurEntero : eurDecimal).format(cents / 100)
}

/** "1.234,50", "1.500", "1234.5" → céntimos. Devuelve null si no es un importe válido. */
export function parseEurosACents(valor: string): number | null {
  const limpio = valor.trim().replace(/\s|€/g, '')
  if (!limpio) return null
  // Formato es-ES: con coma, la coma es el decimal y los puntos son miles. Sin
  // coma, "1.500" / "12.000.000" (grupos de 3) también son miles, no decimales.
  const normal = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(limpio)
      ? limpio.replace(/\./g, '')
      : limpio
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
