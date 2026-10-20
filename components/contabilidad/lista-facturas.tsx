import Link from 'next/link'
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { eliminarFactura, marcarFacturaPagada, marcarFacturaPendiente } from '@/actions/contabilidad'
import { estadoFactura } from '@/lib/catalogos'
import { formatEUR, formatFecha } from '@/lib/formato'
import { Badge } from '@/components/ui/badge'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { CamposMarcarPagada } from '@/components/campos'
import { BotonPdf } from '@/components/contabilidad/boton-pdf'
import { NuevaFactura } from '@/components/contabilidad/nueva-factura'
import type { OpcionesFactura } from '@/components/contabilidad/form-factura'
import type { Factura } from '@/lib/supabase/types'

export function ListaFacturas({
  facturas,
  opciones,
  ocultarContraparte = false,
}: {
  facturas: Factura[]
  opciones: OpcionesFactura
  ocultarContraparte?: boolean
}) {
  return (
    <ul className="divide-y divide-hairline/[0.06]">
      {facturas.map((f) => {
        const estado = estadoFactura(f.tipo, f.estado)
        const pagadaLabel = f.tipo === 'venta' ? 'cobrada' : 'pagada'
        return (
          <li key={f.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="tabular text-xs font-semibold text-ink/45">{f.numero}</span>
                {!ocultarContraparte &&
                  (f.cliente_id ? (
                    <Link
                      href={`/clientes/${f.cliente_id}`}
                      className="truncate text-sm font-semibold text-ink hover:text-brand-300"
                    >
                      {f.contraparte}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-semibold text-ink">{f.contraparte}</span>
                  ))}
              </div>
              <p className="truncate text-sm text-ink/70">{f.concepto}</p>
              <p className="mt-0.5 text-xs text-ink/40">
                {formatFecha(f.fecha)}
                {f.estado === 'pagada' && f.fecha_pago && ` · ${pagadaLabel} el ${formatFecha(f.fecha_pago)}`}
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center justify-between gap-2 sm:justify-end">
              <div className="text-right">
                <p className="tabular text-sm font-bold text-ink">{formatEUR(f.total_cents)}</p>
                <p className="tabular text-[11px] text-ink/40">
                  Base {formatEUR(f.base_cents)}
                  {f.iva_pct > 0 && ` · IVA ${f.iva_pct}%`}
                  {f.irpf_pct > 0 && ` · IRPF ${f.irpf_pct}%`}
                </p>
              </div>
              <Badge tone={estado.tone} className="hidden sm:inline-flex">
                {estado.label}
              </Badge>
              <div className="flex items-center">
                {f.pdf_path && <BotonPdf facturaId={f.id} />}
                {f.estado === 'pendiente' ? (
                  <FormDialogo
                    titulo={`Marcar como ${pagadaLabel}`}
                    trigger={<Check size={15} />}
                    triggerVariant="ghost"
                    triggerSize="icon"
                    triggerTitle={`Marcar como ${pagadaLabel}`}
                    action={marcarFacturaPagada}
                    submitLabel={`Marcar como ${pagadaLabel}`}
                  >
                    <CamposMarcarPagada factura={f} />
                  </FormDialogo>
                ) : (
                  <BotonAccion
                    action={marcarFacturaPendiente.bind(null, f.id)}
                    confirmar="¿Volver a dejar esta factura como pendiente?"
                    size="icon"
                    title="Volver a pendiente"
                  >
                    <RotateCcw size={15} />
                  </BotonAccion>
                )}
                <NuevaFactura
                  tipo={f.tipo}
                  factura={f}
                  opciones={opciones}
                  trigger={<Pencil size={15} />}
                  triggerVariant="ghost"
                  triggerSize="icon"
                  triggerTitle="Editar"
                />
                <BotonAccion
                  action={eliminarFactura.bind(null, f.id)}
                  confirmar={`¿Eliminar la factura ${f.numero}? Se borra también su archivo adjunto.`}
                  size="icon"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </BotonAccion>
              </div>
            </div>
            <Badge tone={estado.tone} className="self-start sm:hidden">
              {estado.label}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}
