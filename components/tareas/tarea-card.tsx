'use client'

import { CalendarClock, CheckCircle2, ListChecks, Repeat } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { clsx } from '@/lib/clsx'
import { PRIORIDADES, fechaCorta, fechaMadrid, vencimiento } from '@/lib/tareas'
import type { TareaConSubtareas } from '@/components/tareas/tipos'

export function TareaCard({
  tarea,
  cliente,
  servicio,
  hoy,
  onAbrir,
  draggable = false,
  onDragStart,
  onDragEnd,
}: {
  tarea: TareaConSubtareas
  cliente?: string
  servicio?: string
  hoy: string
  onAbrir: () => void
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const venc = vencimiento(tarea.fecha_limite, tarea.estado, hoy)
  const total = tarea.subtareas.length
  const hechas = tarea.subtareas.filter((s) => s.hecha).length
  const hecha = tarea.estado === 'hecho'

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAbrir()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${tarea.titulo}`}
      className={clsx(
        'group min-w-0 cursor-pointer space-y-2.5 overflow-hidden bg-elevated p-3.5 transition-colors hover:border-brand-500/40 hover:shadow-lift sm:p-3.5',
        draggable && 'active:cursor-grabbing',
        venc === 'vencida' && 'border-red-500/30'
      )}
    >
      <div className="min-w-0">
        <p
          className={clsx(
            'line-clamp-2 text-sm font-bold text-ink group-hover:text-brand-300',
            hecha && 'text-ink/60 line-through decoration-ink/30'
          )}
        >
          {tarea.titulo}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-ink/45">
          {tarea.recurrencia_id && (
            <span title="Recurrente" className="flex-shrink-0">
              <Repeat size={12} className="text-ink/40" aria-label="Recurrente" />
            </span>
          )}
          <span className="truncate">
            {cliente ?? 'Interna'}
            {servicio && ` · ${servicio}`}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {!hecha && <Badge tone={PRIORIDADES[tarea.prioridad].tone}>{PRIORIDADES[tarea.prioridad].label}</Badge>}
        {hecha && tarea.completada_at ? (
          <Badge tone="success">
            <CheckCircle2 size={12} />
            Hecho el {fechaCorta(fechaMadrid(tarea.completada_at))}
          </Badge>
        ) : (
          tarea.fecha_limite && (
            <Badge tone={venc === 'vencida' ? 'danger' : venc === 'hoy' ? 'warning' : 'neutral'}>
              <CalendarClock size={12} />
              {venc === 'vencida' ? `Vencida · ${fechaCorta(tarea.fecha_limite)}` : venc === 'hoy' ? 'Hoy' : fechaCorta(tarea.fecha_limite)}
            </Badge>
          )
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-ink/50">
          <ListChecks size={13} className="flex-shrink-0 text-ink/35" />
          <span className="tabular">
            {hechas}/{total}
          </span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-hairline/10">
            <span
              className="block h-full rounded-full bg-brand-500"
              style={{ width: `${Math.round((hechas / total) * 100)}%` }}
            />
          </span>
        </div>
      )}
    </Card>
  )
}
