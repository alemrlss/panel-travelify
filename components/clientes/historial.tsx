import {
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  FilePlus2,
  FileX,
  KanbanSquare,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import { anadirNota, eliminarNota } from '@/actions/clientes'
import { formatFecha, hoyISO } from '@/lib/formato'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { Campo, Input, Textarea } from '@/components/ui/input'
import { clsx } from '@/lib/clsx'
import type { ClienteEvento, TipoEvento } from '@/lib/supabase/types'

const ICONOS: Record<TipoEvento, { icon: LucideIcon; color: string }> = {
  cliente_alta: { icon: UserPlus, color: 'text-emerald-300' },
  cliente_baja: { icon: UserX, color: 'text-red-300' },
  cliente_reactivado: { icon: UserCheck, color: 'text-emerald-300' },
  cliente_vinculado: { icon: KanbanSquare, color: 'text-brand-300' },
  servicio_alta: { icon: Plus, color: 'text-brand-300' },
  servicio_estado: { icon: CheckCircle2, color: 'text-ink/60' },
  servicio_cambio: { icon: Pencil, color: 'text-ink/60' },
  servicio_eliminado: { icon: Trash2, color: 'text-ink/45' },
  contrato_alta: { icon: FilePlus2, color: 'text-brand-300' },
  contrato_baja: { icon: FileX, color: 'text-red-300' },
  contrato_eliminado: { icon: Trash2, color: 'text-ink/45' },
  nota: { icon: MessageSquare, color: 'text-sky-300' },
}

/** Icono según el estado al que pasó el servicio (el tipo no lo distingue). */
function iconoEvento(e: ClienteEvento) {
  if (e.tipo === 'servicio_estado') {
    if (/cancelado|dado de baja/.test(e.descripcion)) return { icon: Ban, color: 'text-red-300' }
    if (/reactivado/.test(e.descripcion)) return { icon: RotateCcw, color: 'text-brand-300' }
    if (/entregado/.test(e.descripcion)) return { icon: CheckCircle2, color: 'text-emerald-300' }
    return { icon: ArrowRightLeft, color: 'text-sky-300' }
  }
  if (e.tipo === 'cliente_vinculado') return { icon: Link2, color: 'text-brand-300' }
  return ICONOS[e.tipo]
}

export function Historial({ clienteId, eventos }: { clienteId: string; eventos: ClienteEvento[] }) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <FormDialogo
          titulo="Añadir al historial"
          trigger={
            <>
              <MessageSquare size={15} />
              Añadir nota
            </>
          }
          triggerSize="sm"
          action={anadirNota}
          submitLabel="Guardar nota"
        >
          <input type="hidden" name="cliente_id" value={clienteId} />
          <Campo label="Fecha">
            <Input name="fecha" type="date" required defaultValue={hoyISO()} />
          </Campo>
          <Campo label="Qué pasó">
            <Textarea
              name="descripcion"
              required
              placeholder="Llamada de seguimiento, reunión, incidencia, cambio que pidió…"
            />
          </Campo>
        </FormDialogo>
      </div>

      {eventos.length === 0 ? (
        <p className="py-2 text-center text-sm text-ink/40">Todavía no hay nada en el historial</p>
      ) : (
        <ol className="relative space-y-4 border-l border-hairline/10 pl-6">
          {eventos.map((e) => {
            const { icon: Icon, color } = iconoEvento(e)
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full border border-hairline/10 bg-card">
                  <Icon size={13} className={color} />
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tabular text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                      {formatFecha(e.fecha)}
                    </p>
                    <p className={clsx('mt-0.5 whitespace-pre-line text-sm', e.tipo === 'nota' ? 'text-ink/80' : 'text-ink')}>
                      {e.descripcion}
                    </p>
                  </div>
                  {e.tipo === 'nota' && (
                    <BotonAccion
                      action={eliminarNota.bind(null, e.id)}
                      confirmar="¿Eliminar esta nota del historial?"
                      size="icon"
                      title="Eliminar nota"
                    >
                      <Trash2 size={14} />
                    </BotonAccion>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
