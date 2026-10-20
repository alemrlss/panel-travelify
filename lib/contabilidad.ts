import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { hoyISO, inicioDeMes, nombreMes } from '@/lib/formato'
import type { EstadoFactura, Factura, TipoFactura } from '@/lib/supabase/types'

// Volumen de un autónomo (decenas de facturas al mes): se traen las filas y se
// agregan en JS. Imputación por fecha de factura (devengo), como el IVA trimestral.

export type Periodo = { tipo: 'mes' | 'trimestre' | 'año'; valor: string; desde: string; hasta: string; etiqueta: string }

function sumarMeses(inicio: string, n: number) {
  return inicioDeMes(n, inicio)
}

/** "2026-10" (mes), "2026-T4" (trimestre) o "2026" (año) → rango [desde, hasta). Por defecto el mes actual. */
export function periodoDesdeParam(p?: string): Periodo {
  if (p && /^\d{4}-T[1-4]$/.test(p)) {
    const [y, t] = [p.slice(0, 4), Number(p.slice(6))]
    const desde = `${y}-${String((t - 1) * 3 + 1).padStart(2, '0')}-01`
    return { tipo: 'trimestre', valor: p, desde, hasta: sumarMeses(desde, 3), etiqueta: `${t}.º trimestre ${y}` }
  }
  if (p && /^\d{4}$/.test(p)) {
    return { tipo: 'año', valor: p, desde: `${p}-01-01`, hasta: `${Number(p) + 1}-01-01`, etiqueta: p }
  }
  const valor = p && /^\d{4}-(0[1-9]|1[0-2])$/.test(p) ? p : hoyISO().slice(0, 7)
  const desde = `${valor}-01`
  return { tipo: 'mes', valor, desde, hasta: sumarMeses(desde, 1), etiqueta: nombreMes(desde, true) }
}

export function trimestreActual(hoy = hoyISO()) {
  return `${hoy.slice(0, 4)}-T${Math.floor((Number(hoy.slice(5, 7)) - 1) / 3) + 1}`
}

export async function getFacturas(filtro: {
  tipo?: TipoFactura
  desde?: string
  hasta?: string
  clienteId?: string
  estado?: EstadoFactura
} = {}): Promise<Factura[]> {
  const supabase = await createClient()
  let q = supabase.from('facturas').select('*')
  if (filtro.tipo) q = q.eq('tipo', filtro.tipo)
  if (filtro.desde) q = q.gte('fecha', filtro.desde)
  if (filtro.hasta) q = q.lt('fecha', filtro.hasta)
  if (filtro.clienteId) q = q.eq('cliente_id', filtro.clienteId)
  if (filtro.estado) q = q.eq('estado', filtro.estado)
  const { data, error } = await q
    .order('fecha', { ascending: false })
    .order('numero', { ascending: false })
  if (error) throw new Error(`No se pudieron leer las facturas: ${error.message}`)
  return data ?? []
}

const suma = (fs: Factura[], campo: 'base_cents' | 'iva_cents' | 'irpf_cents' | 'total_cents') =>
  fs.reduce((t, f) => t + f[campo], 0)

/** Ingresos/gastos/beneficio sobre la base imponible (sin IVA), como computa en el IRPF. */
export function resumen(facturas: Factura[]) {
  const ventas = facturas.filter((f) => f.tipo === 'venta')
  const compras = facturas.filter((f) => f.tipo === 'compra')
  const ingresos = suma(ventas, 'base_cents')
  const gastos = suma(compras, 'base_cents')
  const ivaRepercutido = suma(ventas, 'iva_cents')
  const ivaSoportado = suma(compras, 'iva_cents')
  return {
    ingresos,
    gastos,
    beneficio: ingresos - gastos,
    ivaRepercutido,
    ivaSoportado,
    ivaResultado: ivaRepercutido - ivaSoportado,
    irpfVentas: suma(ventas, 'irpf_cents'),
    irpfCompras: suma(compras, 'irpf_cents'),
    pendienteCobro: suma(ventas.filter((f) => f.estado === 'pendiente'), 'total_cents'),
    pendientePago: suma(compras.filter((f) => f.estado === 'pendiente'), 'total_cents'),
    nVentas: ventas.length,
    nCompras: compras.length,
  }
}

export type Resumen = ReturnType<typeof resumen>

export async function resumenTrimestral(año: number) {
  const facturas = await getFacturas({ desde: `${año}-01-01`, hasta: `${año + 1}-01-01` })
  const trimestres = [1, 2, 3, 4].map((t) => {
    const desde = `${año}-${String((t - 1) * 3 + 1).padStart(2, '0')}-01`
    const hasta = sumarMeses(desde, 3)
    return { t, ...resumen(facturas.filter((f) => f.fecha >= desde && f.fecha < hasta)) }
  })
  return { trimestres, total: resumen(facturas) }
}

/** Base imponible de ventas y compras por mes, últimos `n` meses (incluido el actual). */
export async function serieMensual(n = 6) {
  const hoy = hoyISO()
  const meses = Array.from({ length: n }, (_, i) => inicioDeMes(i - (n - 1), hoy))
  const facturas = await getFacturas({ desde: meses[0], hasta: inicioDeMes(1, hoy) })
  return meses.map((inicio) => {
    const fin = sumarMeses(inicio, 1)
    const delMes = facturas.filter((f) => f.fecha >= inicio && f.fecha < fin)
    const r = resumen(delMes)
    return { inicio, ingresos: r.ingresos, gastos: r.gastos }
  })
}

/** Siguiente número "AAAA-NNN" a partir del último de venta del año (solo sugerencia). */
export async function siguienteNumeroVenta(año = Number(hoyISO().slice(0, 4))) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('facturas')
    .select('numero')
    .eq('tipo', 'venta')
    .like('numero', `${año}-%`)
  const max = (data ?? []).reduce((m, f) => {
    const n = Number(f.numero.slice(5))
    return Number.isInteger(n) && n > m ? n : m
  }, 0)
  return `${año}-${String(max + 1).padStart(3, '0')}`
}

/** Proveedores ya usados en compras, para el autocompletado. */
export async function proveedoresUsados() {
  const supabase = await createClient()
  const { data } = await supabase.from('facturas').select('contraparte').eq('tipo', 'compra')
  return [...new Set((data ?? []).map((f) => f.contraparte))].sort((a, b) => a.localeCompare(b, 'es'))
}

/** Lo que necesita el formulario de factura (Contabilidad, ficha de cliente, edición). */
export async function getOpcionesFactura() {
  const supabase = await createClient()
  const [{ data: clientes }, { data: proyectos }, proveedores, numeroSugerido] = await Promise.all([
    supabase.from('clientes').select('id, nombre_cache, estado').order('nombre_cache'),
    supabase.from('proyectos').select('id, nombre, cliente_id').order('nombre'),
    proveedoresUsados(),
    siguienteNumeroVenta(),
  ])
  return {
    // Activos primero: son a los que se factura casi siempre.
    clientes: (clientes ?? [])
      .slice()
      .sort((a, b) => Number(b.estado === 'activo') - Number(a.estado === 'activo'))
      .map(({ id, nombre_cache }) => ({ id, nombre_cache })),
    proyectos: proyectos ?? [],
    proveedores,
    numeroSugerido,
  }
}

/** Días transcurridos desde una fecha YYYY-MM-DD hasta hoy (Madrid). */
export function diasDesde(fecha: string, hoy = hoyISO()) {
  return Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86_400_000)
}
