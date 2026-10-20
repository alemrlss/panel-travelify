import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { hoyISO, inicioDeMes } from '@/lib/formato'
import type { Cliente } from '@/lib/supabase/types'

// "Cuánto facturo con cada cliente" sale solo de sus facturas de venta reales
// (total_cents: lo que paga el cliente, con los descuentos ya aplicados).
// La cuota de referencia es informativa: se muestra al lado, no se calcula con ella.

export type FacturacionCliente = {
  esteMes: number
  ultimos12: number
  mediaMensual: number
  total: number
  pendiente: number
  nFacturas: number
  referencia: number | null
  diferencia: number | null
}

export async function facturacionPorCliente(
  clientes: Pick<Cliente, 'id' | 'fecha_inicio' | 'cuota_referencia_cents'>[]
): Promise<Map<string, FacturacionCliente>> {
  const supabase = await createClient()
  const hoy = hoyISO()
  const mesActual = inicioDeMes(0, hoy)
  const desde12 = inicioDeMes(-11, hoy)

  const { data: ventas } = await supabase
    .from('facturas')
    .select('cliente_id, fecha, total_cents, estado')
    .eq('tipo', 'venta')
    .not('cliente_id', 'is', null)

  const resultado = new Map<string, FacturacionCliente>()
  for (const c of clientes) {
    const suyas = (ventas ?? []).filter((v) => v.cliente_id === c.id)
    const sumar = (fs: typeof suyas) => fs.reduce((t, f) => t + f.total_cents, 0)
    const esteMes = sumar(suyas.filter((f) => f.fecha >= mesActual))
    const ultimos12 = sumar(suyas.filter((f) => f.fecha >= desde12))

    // Media sobre los meses con el cliente dentro de la ventana de 12 (mínimo 1):
    // un cliente de hace 3 meses no queda diluido entre 12.
    const inicioRelacion = c.fecha_inicio > desde12 ? c.fecha_inicio.slice(0, 7) + '-01' : desde12
    const meses = Math.max(
      1,
      (Number(mesActual.slice(0, 4)) - Number(inicioRelacion.slice(0, 4))) * 12 +
        (Number(mesActual.slice(5, 7)) - Number(inicioRelacion.slice(5, 7))) +
        1
    )

    const referencia = c.cuota_referencia_cents
    resultado.set(c.id, {
      esteMes,
      ultimos12,
      mediaMensual: Math.round(ultimos12 / meses),
      total: sumar(suyas),
      pendiente: sumar(suyas.filter((f) => f.estado === 'pendiente')),
      nFacturas: suyas.length,
      referencia,
      diferencia: referencia === null ? null : esteMes - referencia,
    })
  }
  return resultado
}
