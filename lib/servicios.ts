import type { Tone } from '@/components/ui/badge'
import { formatEUR } from '@/lib/formato'
import type { EstadoProyecto, Proyecto, TipoCobro } from '@/lib/supabase/types'

// Servicios contratados: estados según el tipo de cobro y el dinero que entra.
//   Recurrente (mensual/trimestral/anual): En curso → De baja (y reactivar).
//   Pago único: Planificado → En curso → En revisión → Entregado (o Cancelado).
// El importe es lo que se cobra de verdad (con descuento si lo hay).
// Tiene que coincidir con supabase/migrations/0009_estados_por_tipo_de_cobro.sql.

export function esRecurrente(cobro: TipoCobro) {
  return cobro !== 'unico'
}

/** Estados posibles para un servicio con ese tipo de cobro, en orden del flujo. */
export function estadosPosibles(cobro: TipoCobro): EstadoProyecto[] {
  return esRecurrente(cobro)
    ? ['en_curso', 'baja']
    : ['planificado', 'en_curso', 'en_revision', 'entregado', 'baja']
}

const ETIQUETAS: Record<Exclude<EstadoProyecto, 'baja'>, { label: string; tone: Tone; desde: string }> = {
  planificado: { label: 'Planificado', tone: 'neutral', desde: 'Planificado desde' },
  en_curso: { label: 'En curso', tone: 'brand', desde: 'En curso desde' },
  en_revision: { label: 'En revisión', tone: 'info', desde: 'En revisión del cliente desde' },
  entregado: { label: 'Entregado', tone: 'success', desde: 'Entregado el' },
}

/** Etiqueta visible: "baja" se lee "De baja" en un recurrente y "Cancelado" en un pago único. */
export function estadoServicio(estado: EstadoProyecto, cobro: TipoCobro) {
  if (estado === 'baja') {
    return esRecurrente(cobro)
      ? { label: 'De baja', tone: 'danger' as Tone, desde: 'De baja desde el' }
      : { label: 'Cancelado', tone: 'danger' as Tone, desde: 'Cancelado el' }
  }
  return ETIQUETAS[estado]
}

/** Siguiente paso lógico (para proponerlo por defecto al cambiar de estado). */
export function siguienteEstado(estado: EstadoProyecto, cobro: TipoCobro): EstadoProyecto {
  if (esRecurrente(cobro)) return estado === 'en_curso' ? 'baja' : 'en_curso'
  const flujo: EstadoProyecto[] = ['planificado', 'en_curso', 'en_revision', 'entregado']
  const i = flujo.indexOf(estado)
  return i === -1 ? 'en_curso' : flujo[Math.min(i + 1, flujo.length - 1)]
}

/** Texto del historial al cambiar de estado. */
export function verboEstado(estado: EstadoProyecto, cobro: TipoCobro, desdeBaja: boolean) {
  if (estado === 'baja') return esRecurrente(cobro) ? 'dado de baja' : 'cancelado'
  if (desdeBaja) return `reactivado (${ETIQUETAS[estado].label.toLowerCase()})`
  return { planificado: 'pasó a Planificado', en_curso: 'pasó a En curso', en_revision: 'pasó a En revisión del cliente', entregado: 'entregado' }[estado]
}

// ─── Dinero ──────────────────────────────────────────────────────────────────

const DIVISOR: Record<Exclude<TipoCobro, 'unico'>, number> = { mensual: 1, trimestral: 3, anual: 12 }
const SUFIJO: Record<TipoCobro, string> = { mensual: '/mes', trimestral: '/trimestre', anual: '/año', unico: ' (pago único)' }

type ConCobro = Pick<Proyecto, 'cobro' | 'importe_cents' | 'estado'>

/** Equivalente mensual de un recurrente en curso, en céntimos (trimestral ÷ 3, anual ÷ 12). */
export function mensual(s: ConCobro) {
  if (s.cobro === 'unico' || !s.importe_cents || s.estado !== 'en_curso') return 0
  return Math.round(s.importe_cents / DIVISOR[s.cobro])
}

export function recurrenteMensual(servicios: ConCobro[]) {
  return servicios.reduce((t, s) => t + mensual(s), 0)
}

/** Pagos únicos que ya cuentan: los entregados. */
export function pagosUnicos(servicios: ConCobro[]) {
  return servicios
    .filter((s) => s.cobro === 'unico' && s.estado === 'entregado')
    .reduce((t, s) => t + (s.importe_cents ?? 0), 0)
}

/** Pagos únicos todavía sin entregar (ni cancelados): lo que entrará al entregarlos. */
export function pagosUnicosEnMarcha(servicios: ConCobro[]) {
  return servicios
    .filter((s) => s.cobro === 'unico' && s.estado !== 'entregado' && s.estado !== 'baja')
    .reduce((t, s) => t + (s.importe_cents ?? 0), 0)
}

/** "450 €/mes", "1500 € (pago único)" o "sin importe". */
export function describirImporte(s: Pick<Proyecto, 'cobro' | 'importe_cents'>) {
  return s.importe_cents == null ? 'sin importe' : `${formatEUR(s.importe_cents)}${SUFIJO[s.cobro]}`
}
