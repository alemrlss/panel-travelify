'use client'

import { useCallback, useEffect, useState, useTransition, type DragEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ListTodo } from 'lucide-react'
import { moverTarea } from '@/actions/tareas'
import { Badge } from '@/components/ui/badge'
import { clsx } from '@/lib/clsx'
import { ESTADOS_TAREA } from '@/lib/tareas'
import { TareaCard } from '@/components/tareas/tarea-card'
import { DetalleTarea } from '@/components/tareas/detalle-tarea'
import type { EstadoTarea } from '@/lib/supabase/types'
import type { OpcionCliente, OpcionServicio, TareaConSubtareas } from '@/components/tareas/tipos'

export interface ColumnaTareas {
  estado: EstadoTarea
  tareas: TareaConSubtareas[]
}

export function TareasBoard({
  columnasIniciales,
  clientes,
  servicios,
  hoy,
  tareaInicial,
  hechasHref,
  verTodasHechas,
}: {
  columnasIniciales: ColumnaTareas[]
  clientes: OpcionCliente[]
  servicios: OpcionServicio[]
  hoy: string
  /** Tarea que se abre al entrar (enlaces /tareas?tarea=ID desde el Dashboard o la ficha de cliente). */
  tareaInicial?: string
  /** Enlace para alternar entre hechas recientes y todas. */
  hechasHref: string
  verTodasHechas: boolean
}) {
  const router = useRouter()
  const [columnas, setColumnas] = useState(columnasIniciales)
  // Igual que en el Pipeline: sin esto, router.refresh() trae datos nuevos pero la
  // tarjeta se queda en la columna vieja hasta recargar a mano.
  useEffect(() => {
    setColumnas(columnasIniciales)
  }, [columnasIniciales])
  const [, startTransition] = useTransition()
  const [dragging, setDragging] = useState<{ id: string; desde: EstadoTarea } | null>(null)
  const [dragOver, setDragOver] = useState<EstadoTarea | null>(null)
  const [activa, setActiva] = useState<EstadoTarea>(columnasIniciales[0]?.estado ?? 'por_hacer')
  const [abierta, setAbierta] = useState<string | null>(tareaInicial ?? null)

  const nombreCliente = (id: string | null) => (id ? clientes.find((c) => c.id === id)?.empresa : undefined)
  const nombreServicio = (id: string | null) => (id ? servicios.find((s) => s.id === id)?.nombre : undefined)

  function moverLocal(id: string, desde: EstadoTarea, hasta: EstadoTarea) {
    setColumnas((prev) => {
      let movida: TareaConSubtareas | undefined
      const sinOrigen = prev.map((c) => {
        if (c.estado !== desde) return c
        movida = c.tareas.find((t) => t.id === id)
        return { ...c, tareas: c.tareas.filter((t) => t.id !== id) }
      })
      if (!movida) return prev
      const actualizada: TareaConSubtareas = {
        ...movida,
        estado: hasta,
        completada_at: hasta === 'hecho' ? new Date().toISOString() : null,
      }
      return sinOrigen.map((c) =>
        c.estado === hasta ? { ...c, tareas: hasta === 'hecho' ? [actualizada, ...c.tareas] : [...c.tareas, actualizada] } : c
      )
    })
  }

  function handleDrop(hasta: EstadoTarea) {
    setDragOver(null)
    if (!dragging || dragging.desde === hasta) {
      setDragging(null)
      return
    }
    const { id, desde } = dragging
    setDragging(null)
    moverLocal(id, desde, hasta)
    startTransition(async () => {
      await moverTarea(id, hasta)
      router.refresh()
    })
  }

  const refrescar = useCallback(() => router.refresh(), [router])
  const cerrar = useCallback(() => {
    setAbierta(null)
    // Quita ?tarea= de la URL para que recargar no vuelva a abrirla.
    const url = new URL(window.location.href)
    if (url.searchParams.has('tarea')) {
      url.searchParams.delete('tarea')
      window.history.replaceState(null, '', url.pathname + url.search)
    }
  }, [])

  const tareaAbierta = abierta ? columnas.flatMap((c) => c.tareas).find((t) => t.id === abierta) ?? null : null
  const activaCol = columnas.find((c) => c.estado === activa) ?? columnas[0]

  const tarjeta = (t: TareaConSubtareas, arrastrable: boolean, estado: EstadoTarea) => (
    <TareaCard
      key={t.id}
      tarea={t}
      cliente={nombreCliente(t.cliente_id)}
      servicio={nombreServicio(t.proyecto_id)}
      hoy={hoy}
      onAbrir={() => setAbierta(t.id)}
      draggable={arrastrable}
      onDragStart={() => setDragging({ id: t.id, desde: estado })}
      onDragEnd={() => {
        setDragging(null)
        setDragOver(null)
      }}
    />
  )

  const enlaceHechas = (
    <Link href={hechasHref} className="block px-1 pt-2 text-center text-xs font-semibold text-brand-300 hover:text-brand-200">
      {verTodasHechas ? 'Ver solo las recientes' : 'Ver todas las hechas'}
    </Link>
  )

  return (
    <div>
      {/* Móvil: una columna a la vez, sin arrastre (no funciona en táctil). El estado se cambia desde el detalle. */}
      <div className="md:hidden">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {columnas.map((col) => (
            <button
              key={col.estado}
              type="button"
              onClick={() => setActiva(col.estado)}
              className={clsx(
                'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
                activa === col.estado ? 'border-brand-500 bg-brand-600 text-white' : 'border-hairline/10 bg-card text-ink/55'
              )}
            >
              {ESTADOS_TAREA[col.estado].label}
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                  activa === col.estado ? 'bg-white/20' : 'bg-hairline/10'
                )}
              >
                {col.tareas.length}
              </span>
            </button>
          ))}
        </div>
        {activaCol && activaCol.tareas.length === 0 && <SinTareas />}
        <div className="space-y-3">{activaCol?.tareas.map((t) => tarjeta(t, false, activaCol.estado))}</div>
        {activaCol?.estado === 'hecho' && enlaceHechas}
      </div>

      {/* Desktop: tres columnas con arrastrar y soltar */}
      <div className="hidden gap-3 md:grid md:grid-cols-3">
        {columnas.map((col) => (
          <div
            key={col.estado}
            onDragOver={(e: DragEvent) => {
              e.preventDefault()
              if (dragOver !== col.estado) setDragOver(col.estado)
            }}
            onDragLeave={() => setDragOver((s) => (s === col.estado ? null : s))}
            onDrop={(e: DragEvent) => {
              e.preventDefault()
              handleDrop(col.estado)
            }}
            className={clsx(
              'flex min-h-[460px] min-w-0 flex-col rounded-2xl border border-hairline/[0.06] bg-hairline/[0.02] p-2 transition-colors',
              dragOver === col.estado && 'border-brand-500/60 bg-brand-500/[0.07] ring-2 ring-brand-500/30'
            )}
          >
            <div className="mb-2 overflow-hidden rounded-xl border border-hairline/[0.06] bg-card">
              <div className="h-1" style={{ backgroundColor: ESTADOS_TAREA[col.estado].color }} />
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <h2 className="truncate text-sm font-bold text-ink">{ESTADOS_TAREA[col.estado].label}</h2>
                <Badge tone="neutral">{col.tareas.length}</Badge>
              </div>
            </div>
            {col.tareas.length === 0 && (
              <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-hairline/10 text-xs text-ink/30">
                Arrastra aquí
              </p>
            )}
            <div className="space-y-2">{col.tareas.map((t) => tarjeta(t, true, col.estado))}</div>
            {col.estado === 'hecho' && enlaceHechas}
          </div>
        ))}
      </div>

      <DetalleTarea
        tarea={tareaAbierta}
        clientes={clientes}
        servicios={servicios}
        onCerrar={cerrar}
        onCambio={refrescar}
      />
    </div>
  )
}

function SinTareas() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-hairline/10 bg-card px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-brand-300">
        <ListTodo size={22} />
      </span>
      <p className="text-sm font-semibold text-ink">Sin tareas en esta columna</p>
    </div>
  )
}
