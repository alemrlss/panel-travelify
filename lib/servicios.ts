import type { EstadoProyecto, Proyecto, TipoCobro } from '@/lib/supabase/types'

// Recurrente mensual de los servicios contratados. El importe es lo que se cobra
// de verdad (con descuento si lo hay). Trimestral ÷ 3, anual ÷ 12; el pago único
// no es recurrente.

const DIVISOR: Record<Exclude<TipoCobro, 'unico'>, number> = { mensual: 1, trimestral: 3, anual: 12 }

/** Solo se factura lo que está en marcha: ni planificado, ni entregado/terminado, ni pausado. */
const ESTADOS_ACTIVOS: EstadoProyecto[] = ['en_curso', 'en_revision']

export function esRecurrente(s: Pick<Proyecto, 'cobro'>) {
  return s.cobro !== 'unico'
}

/** Equivalente mensual de un servicio recurrente activo, en céntimos (0 si no aplica). */
export function mensual(s: Pick<Proyecto, 'cobro' | 'importe_cents' | 'estado'>) {
  if (s.cobro === 'unico' || !s.importe_cents || !ESTADOS_ACTIVOS.includes(s.estado)) return 0
  return Math.round(s.importe_cents / DIVISOR[s.cobro])
}

export function recurrenteMensual(servicios: Pick<Proyecto, 'cobro' | 'importe_cents' | 'estado'>[]) {
  return servicios.reduce((t, s) => t + mensual(s), 0)
}
