import Link from 'next/link'
import { CalendarClock, ListTodo } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { ESTADOS_TAREA, PRIORIDADES, fechaCorta, ordenarTareas, vencimiento } from '@/lib/tareas'
import type { Tarea } from '@/lib/supabase/types'

/** Tareas pendientes de un cliente (ficha de cliente y Dashboard). Cada fila abre la tarea en /tareas. */
export function ListaTareas({
  tareas,
  hoy,
  servicios = {},
  clientes = {},
  limite,
  vacio = 'Sin tareas pendientes',
}: {
  tareas: Tarea[]
  hoy: string
  servicios?: Record<string, string>
  clientes?: Record<string, string>
  limite?: number
  vacio?: string
}) {
  const ordenadas = ordenarTareas(tareas, hoy).slice(0, limite)
  if (ordenadas.length === 0) return <EstadoVacio icon={<ListTodo size={20} />} titulo={vacio} />

  return (
    <ul className="divide-y divide-hairline/[0.06]">
      {ordenadas.map((t) => {
        const venc = vencimiento(t.fecha_limite, t.estado, hoy)
        const contexto = [t.cliente_id && clientes[t.cliente_id], t.proyecto_id && servicios[t.proyecto_id]]
          .filter(Boolean)
          .join(' · ')
        return (
          <li key={t.id}>
            <Link
              href={`/tareas?tarea=${t.id}`}
              className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-brand-300"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{t.titulo}</p>
                <p className="truncate text-xs text-ink/45">
                  {ESTADOS_TAREA[t.estado].label}
                  {contexto && ` · ${contexto}`}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Badge tone={PRIORIDADES[t.prioridad].tone}>{PRIORIDADES[t.prioridad].label}</Badge>
                {t.fecha_limite && (
                  <Badge tone={venc === 'vencida' ? 'danger' : venc === 'hoy' ? 'warning' : 'neutral'}>
                    <CalendarClock size={12} />
                    {venc === 'vencida' ? 'Vencida' : venc === 'hoy' ? 'Hoy' : fechaCorta(t.fecha_limite)}
                  </Badge>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
