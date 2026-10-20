import Link from 'next/link'
import { Ban, Check, RotateCcw, Trash2 } from 'lucide-react'
import { eliminarPago, marcarPagado, setEstadoPago } from '@/actions/facturacion'
import { formatEUR, formatFecha } from '@/lib/formato'
import { esVencido } from '@/lib/metricas'
import { Badge } from '@/components/ui/badge'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { CamposMarcarPagado } from '@/components/campos'
import { clsx } from '@/lib/clsx'
import type { Pago } from '@/lib/supabase/types'

export function EstadoPagoBadge({ pago }: { pago: Pago }) {
  if (pago.estado === 'pagado') return <Badge tone="success">Pagado</Badge>
  if (pago.estado === 'anulado') return <Badge tone="neutral">Anulado</Badge>
  if (esVencido(pago)) return <Badge tone="danger">Vencido</Badge>
  return <Badge tone="warning">Pendiente</Badge>
}

/** Lista de pagos con sus acciones. `clientes` muestra el nombre (vista global). */
export function ListaPagos({
  pagos,
  clientes,
}: {
  pagos: Pago[]
  clientes?: Map<string, string>
}) {
  return (
    <ul className="divide-y divide-hairline/[0.06]">
      {pagos.map((p) => {
        const vencido = esVencido(p)
        return (
          <li
            key={p.id}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              {clientes && (
                <Link
                  href={`/clientes/${p.cliente_id}`}
                  className="block truncate text-sm font-semibold text-ink hover:text-brand-300"
                >
                  {clientes.get(p.cliente_id) ?? '—'}
                </Link>
              )}
              <p className={clsx('truncate', clientes ? 'text-xs text-ink/50' : 'text-sm font-medium text-ink')}>
                {p.concepto}
              </p>
              <p className={clsx('mt-0.5 text-xs', vencido ? 'font-semibold text-red-300' : 'text-ink/40')}>
                {p.estado === 'pagado'
                  ? `Pagado el ${formatFecha(p.fecha_pago)}${p.metodo ? ` · ${p.metodo}` : ''}`
                  : `${vencido ? 'Venció' : 'Vence'} el ${formatFecha(p.fecha_vencimiento)}`}
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center justify-between gap-2 sm:justify-end">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'tabular text-sm font-bold',
                    p.estado === 'anulado' ? 'text-ink/35 line-through' : 'text-ink'
                  )}
                >
                  {formatEUR(p.importe_cents)}
                </span>
                <EstadoPagoBadge pago={p} />
              </div>
              <div className="flex items-center">
                {p.estado === 'pendiente' && (
                  <>
                    <FormDialogo
                      titulo="Marcar como pagado"
                      trigger={<Check size={15} />}
                      triggerVariant="ghost"
                      triggerSize="icon"
                      triggerTitle="Marcar como pagado"
                      action={marcarPagado}
                      submitLabel="Marcar como pagado"
                    >
                      <CamposMarcarPagado pago={p} />
                    </FormDialogo>
                    <BotonAccion
                      action={setEstadoPago.bind(null, p.id, 'anulado')}
                      confirmar="¿Anular este cobro? Deja de contar como pendiente."
                      size="icon"
                      title="Anular"
                    >
                      <Ban size={15} />
                    </BotonAccion>
                  </>
                )}
                {p.estado !== 'pendiente' && (
                  <BotonAccion
                    action={setEstadoPago.bind(null, p.id, 'pendiente')}
                    confirmar="¿Volver a dejar este cobro como pendiente?"
                    size="icon"
                    title="Volver a pendiente"
                  >
                    <RotateCcw size={15} />
                  </BotonAccion>
                )}
                <BotonAccion
                  action={eliminarPago.bind(null, p.id)}
                  confirmar="¿Eliminar este cobro? No se puede deshacer."
                  size="icon"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </BotonAccion>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
