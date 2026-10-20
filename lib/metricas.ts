import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { searchOpportunitiesAll } from '@/lib/ghl/client'
import { hoyISO, inicioDeMes } from '@/lib/formato'
import type { Pago, ServicioContratado } from '@/lib/supabase/types'

// Volumen de un negocio unipersonal (decenas de clientes, cientos de pagos):
// se traen las filas y se agregan en JS, sin vistas ni funciones SQL.

export function esVencido(p: Pick<Pago, 'estado' | 'fecha_vencimiento'>, hoy = hoyISO()) {
  return p.estado === 'pendiente' && p.fecha_vencimiento < hoy
}

/** Servicio mensual activo y vigente en la fecha dada. */
export function esRecurrenteVigente(
  s: Pick<ServicioContratado, 'tipo_cobro' | 'activo' | 'fecha_inicio' | 'fecha_fin'>,
  hoy = hoyISO()
) {
  return (
    s.tipo_cobro === 'recurrente_mensual' &&
    s.activo &&
    s.fecha_inicio <= hoy &&
    (!s.fecha_fin || s.fecha_fin >= hoy)
  )
}

export async function getResumenFinanciero() {
  const supabase = await createClient()
  const hoy = hoyISO()

  const [{ data: servicios }, { data: pagos }, { data: clientes }] = await Promise.all([
    supabase.from('servicios_contratados').select('*').eq('activo', true),
    supabase.from('pagos').select('*').neq('estado', 'anulado'),
    supabase.from('clientes').select('id, nombre_cache, estado'),
  ])

  const mrr = (servicios ?? [])
    .filter((s) => esRecurrenteVigente(s, hoy))
    .reduce((t, s) => t + s.importe_cents, 0)

  const mesActual = inicioDeMes(0, hoy)
  const pagados = (pagos ?? []).filter((p) => p.estado === 'pagado' && p.fecha_pago)
  const cobradoMes = pagados
    .filter((p) => p.fecha_pago! >= mesActual)
    .reduce((t, p) => t + p.importe_cents, 0)

  const pendientes = (pagos ?? []).filter((p) => p.estado === 'pendiente')
  const vencidos = pendientes.filter((p) => esVencido(p, hoy))

  // Barras: cobrado por mes, últimos 6 meses (incluido el actual).
  const meses = Array.from({ length: 6 }, (_, i) => inicioDeMes(i - 5, hoy))
  const porMes = meses.map((inicio, i) => {
    const fin = i < 5 ? meses[i + 1] : inicioDeMes(1, hoy)
    return {
      inicio,
      cents: pagados
        .filter((p) => p.fecha_pago! >= inicio && p.fecha_pago! < fin)
        .reduce((t, p) => t + p.importe_cents, 0),
    }
  })

  const nombres = new Map(clientes?.map((c) => [c.id, c.nombre_cache]))

  return {
    mrr,
    cobradoMes,
    pendienteCents: pendientes.reduce((t, p) => t + p.importe_cents, 0),
    vencidoCents: vencidos.reduce((t, p) => t + p.importe_cents, 0),
    nVencidos: vencidos.length,
    clientesActivos: clientes?.filter((c) => c.estado === 'activo').length ?? 0,
    totalClientes: clientes?.length ?? 0,
    porMes,
    proximosCobros: pendientes
      .slice()
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
      .slice(0, 5)
      .map((p) => ({ ...p, cliente: nombres.get(p.cliente_id) ?? '—', vencido: esVencido(p, hoy) })),
  }
}

/** won / (won + lost) de las oportunidades del pipeline tocadas en los últimos 90 días. */
export async function getTasaCierre() {
  const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const opps = await searchOpportunitiesAll({})
  const recientes = opps.filter((o) => (o.updatedAt ?? o.createdAt) >= desde)

  const won = recientes.filter((o) => o.status === 'won').length
  const lost = recientes.filter((o) => o.status === 'lost' || o.status === 'abandoned').length
  const abiertos = opps.filter((o) => o.status === 'open')

  return {
    won,
    lost,
    abiertos: abiertos.length,
    valorAbierto: abiertos.reduce((t, o) => t + (o.monetaryValue ?? 0), 0),
    tasa: won + lost > 0 ? won / (won + lost) : null,
  }
}
