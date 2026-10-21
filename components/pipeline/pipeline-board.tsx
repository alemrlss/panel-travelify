'use client'

import { useEffect, useState, useTransition, type DragEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarPlus, History, Inbox, Mail, Phone, ThumbsDown } from 'lucide-react'
import { moveOpportunityStage } from '@/actions/pipeline'
import { formatEUR, formatFechaHora, getContactoNombre } from '@/lib/formato'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { clsx } from '@/lib/clsx'
import type { GhlOpportunity } from '@/lib/ghl/types'

// Acento de respaldo si la etapa de GHL no trae color propio.
const COLOR_DEFECTO = '#8B5CF6'

export interface Columna {
  stageId: string
  stageName: string
  color?: string
  opportunities: GhlOpportunity[]
}

/** monetaryValue de GHL viene en euros, no en céntimos. */
function sumaValor(opps: GhlOpportunity[]) {
  return opps.reduce((t, o) => t + (o.monetaryValue ?? 0), 0) * 100
}

export type Motivos = Record<string, { motivo: string; detalle: string | null }>

export function PipelineBoard({
  columnasIniciales,
  motivos = {},
  arrastrable = true,
  resumen = 'en el pipeline',
}: {
  columnasIniciales: Columna[]
  motivos?: Motivos
  arrastrable?: boolean
  resumen?: string
}) {
  const router = useRouter()
  const [columnas, setColumnas] = useState(columnasIniciales)
  // `columnasIniciales` solo se usa como valor inicial de useState — sin este
  // efecto, un router.refresh() trae datos nuevos del servidor pero la tarjeta
  // se queda en la columna vieja hasta recargar la página a mano.
  useEffect(() => {
    setColumnas(columnasIniciales)
  }, [columnasIniciales])
  const [, startTransition] = useTransition()
  const [dragging, setDragging] = useState<{ oppId: string; fromStageId: string } | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [activeStageId, setActiveStageId] = useState(columnasIniciales[0]?.stageId)

  function moverLocal(oppId: string, fromStageId: string, toStageId: string) {
    setColumnas((prev) => {
      let movido: GhlOpportunity | undefined
      const sinOrigen = prev.map((c) => {
        if (c.stageId !== fromStageId) return c
        movido = c.opportunities.find((o) => o.id === oppId)
        return { ...c, opportunities: c.opportunities.filter((o) => o.id !== oppId) }
      })
      if (!movido) return prev
      return sinOrigen.map((c) =>
        c.stageId === toStageId ? { ...c, opportunities: [...c.opportunities, movido!] } : c
      )
    })
  }

  function handleDrop(toStageId: string) {
    setDragOverStageId(null)
    if (!dragging || dragging.fromStageId === toStageId) {
      setDragging(null)
      return
    }
    const { oppId, fromStageId } = dragging
    setDragging(null)
    moverLocal(oppId, fromStageId, toStageId)
    startTransition(async () => {
      await moveOpportunityStage(oppId, toStageId)
      router.refresh()
    })
  }

  const activeColumna = columnas.find((c) => c.stageId === activeStageId) ?? columnas[0]
  const totalAbierto = columnas.reduce((t, c) => t + sumaValor(c.opportunities), 0)
  const totalOpps = columnas.reduce((t, c) => t + c.opportunities.length, 0)

  return (
    <div>
      <p className="mb-4 text-sm text-ink/50">
        <span className="font-semibold text-ink">{totalOpps}</span> oportunidades ·{' '}
        <span className="tabular font-semibold text-ink">{formatEUR(totalAbierto)}</span> {resumen}
      </p>

      {/* Vista mobile: una etapa a la vez, sin drag (no funciona en touch) */}
      <div className="md:hidden">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {columnas.map((col) => (
            <button
              key={col.stageId}
              type="button"
              onClick={() => setActiveStageId(col.stageId)}
              className={clsx(
                'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
                activeStageId === col.stageId
                  ? 'border-brand-500 bg-brand-600 text-white'
                  : 'border-hairline/10 bg-card text-ink/55'
              )}
            >
              {col.stageName}
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                  activeStageId === col.stageId ? 'bg-white/20' : 'bg-hairline/10'
                )}
              >
                {col.opportunities.length}
              </span>
            </button>
          ))}
        </div>

        {activeColumna && activeColumna.opportunities.length === 0 && <SinOportunidades />}

        <div className="space-y-3">
          {activeColumna?.opportunities.map((opp) => (
            <OportunidadCard
              key={opp.id}
              opp={opp}
              motivo={motivos[opp.id]}
              draggable={false}
              onDragStart={() => {}}
              onDragEnd={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Vista desktop: columnas lado a lado con drag and drop */}
      <div className="-mx-6 hidden overflow-x-auto px-6 pb-4 md:block">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${columnas.length}, minmax(240px, 1fr))`,
            minWidth: columnas.length * 240 + (columnas.length - 1) * 12,
          }}
        >
          {columnas.map((col) => (
            <div
              key={col.stageId}
              onDragOver={(e: DragEvent) => {
                if (!arrastrable) return
                e.preventDefault()
                if (dragOverStageId !== col.stageId) setDragOverStageId(col.stageId)
              }}
              onDragLeave={() => setDragOverStageId((s) => (s === col.stageId ? null : s))}
              onDrop={(e: DragEvent) => {
                e.preventDefault()
                handleDrop(col.stageId)
              }}
              className={clsx(
                'flex min-h-[460px] flex-col rounded-2xl border border-hairline/[0.06] bg-hairline/[0.02] p-2 transition-colors',
                dragOverStageId === col.stageId &&
                  'border-brand-500/60 bg-brand-500/[0.07] ring-2 ring-brand-500/30'
              )}
            >
              <div className="mb-2 overflow-hidden rounded-xl border border-hairline/[0.06] bg-card">
                <div className="h-1" style={{ backgroundColor: col.color ?? COLOR_DEFECTO }} />
                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-sm font-bold text-ink">{col.stageName}</h2>
                    <Badge tone="neutral">{col.opportunities.length}</Badge>
                  </div>
                  <p className="tabular mt-0.5 text-xs text-ink/40">
                    {formatEUR(sumaValor(col.opportunities))}
                  </p>
                </div>
              </div>
              {col.opportunities.length === 0 && (
                <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-hairline/10 text-xs text-ink/30">
                  {arrastrable ? 'Arrastra aquí' : 'Ninguna'}
                </p>
              )}
              <div className="space-y-2">
                {col.opportunities.map((opp) => (
                  <OportunidadCard
                    key={opp.id}
                    opp={opp}
                    motivo={motivos[opp.id]}
                    draggable={arrastrable}
                    onDragStart={() => setDragging({ oppId: opp.id, fromStageId: col.stageId })}
                    onDragEnd={() => {
                      setDragging(null)
                      setDragOverStageId(null)
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ESTADO_OPP: Record<string, { label: string; tone: 'success' | 'danger' | 'neutral' }> = {
  won: { label: 'Ganada', tone: 'success' },
  lost: { label: 'Perdida', tone: 'danger' },
  abandoned: { label: 'Abandonada', tone: 'neutral' },
}

function OportunidadCard({
  opp,
  motivo,
  draggable = true,
  onDragStart,
  onDragEnd,
}: {
  opp: GhlOpportunity
  motivo?: Motivos[string]
  draggable?: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const nombre = getContactoNombre(opp.contact)
  const estado = ESTADO_OPP[opp.status]

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(
        'min-w-0 space-y-2.5 overflow-hidden bg-elevated p-3.5 hover:shadow-lift sm:p-3.5',
        draggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <div className="min-w-0">
        <Link href={`/pipeline/${opp.id}`} className="block min-w-0">
          <p className="truncate text-sm font-bold text-ink hover:text-brand-300">
            {opp.name || nombre}
          </p>
        </Link>
        {opp.name && opp.name !== nombre && (
          <p className="truncate text-xs text-ink/45">{nombre}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {!!opp.monetaryValue && (
            <Badge tone="brand" className="tabular">
              {formatEUR(opp.monetaryValue * 100)}
            </Badge>
          )}
          {estado && <Badge tone={estado.tone}>{estado.label}</Badge>}
        </div>
      </div>

      {opp.status === 'lost' && (
        <Link
          href={`/pipeline/${opp.id}`}
          className="block rounded-lg border border-red-500/15 bg-red-500/[0.06] px-2.5 py-2 text-xs"
        >
          <span className="flex items-center gap-1.5 font-semibold text-red-300">
            <ThumbsDown size={12} />
            {motivo?.motivo ?? 'Sin motivo: apúntalo'}
          </span>
          {motivo?.detalle && <span className="mt-1 line-clamp-2 block text-ink/60">{motivo.detalle}</span>}
        </Link>
      )}

      <div className="min-w-0 space-y-1 text-xs text-ink/55">
        <p className="flex items-center gap-1.5 truncate">
          <Phone size={13} className="flex-shrink-0 text-ink/30" />
          {opp.contact?.phone ?? '—'}
        </p>
        <p className="flex items-center gap-1.5 truncate">
          <Mail size={13} className="flex-shrink-0 text-ink/30" />
          <span className="truncate">{opp.contact?.email ?? '—'}</span>
        </p>
      </div>

      <div className="space-y-1 border-t border-hairline/[0.06] pt-2.5">
        <Fecha icon={<CalendarPlus size={12} />} label="Creado" iso={opp.createdAt} />
        <Fecha icon={<History size={12} />} label="Actualizado" iso={opp.updatedAt} />
      </div>
    </Card>
  )
}

function Fecha({ icon, label, iso }: { icon: React.ReactNode; label: string; iso?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 text-[11px]">
      <span className="flex flex-shrink-0 items-center gap-1.5 text-ink/40">
        {icon}
        {label}
      </span>
      <span className="truncate font-medium text-ink/65">{iso ? formatFechaHora(iso) : '—'}</span>
    </div>
  )
}

function SinOportunidades() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-hairline/10 bg-card px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-brand-300">
        <Inbox size={22} />
      </span>
      <p className="text-sm font-semibold text-ink">Sin oportunidades en esta etapa</p>
      <p className="mt-1 text-xs text-ink/45">Cuando entren en tu pipeline aparecerán aquí.</p>
    </div>
  )
}
