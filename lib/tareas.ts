// Catálogos y helpers de Tareas (kanban Por hacer / En curso / Hecho).
// "Vencida" no se guarda: es no hecha con fecha_limite < hoy (Madrid), como en pagos.

import type { Tone } from '@/components/ui/badge'
import type { EstadoTarea, PrioridadTarea, Tarea } from '@/lib/supabase/types'

/** El orden de las claves es el orden de las columnas del tablero. */
export const ESTADOS_TAREA: Record<EstadoTarea, { label: string; color: string }> = {
  por_hacer: { label: 'Por hacer', color: '#8B5CF6' },
  en_curso: { label: 'En curso', color: '#F59E0B' },
  hecho: { label: 'Hecho', color: '#10B981' },
}

export const ORDEN_ESTADOS = Object.keys(ESTADOS_TAREA) as EstadoTarea[]

export const PRIORIDADES: Record<PrioridadTarea, { label: string; tone: Tone }> = {
  alta: { label: 'Alta', tone: 'danger' },
  media: { label: 'Media', tone: 'warning' },
  baja: { label: 'Baja', tone: 'neutral' },
}

const PESO_PRIORIDAD: Record<PrioridadTarea, number> = { alta: 0, media: 1, baja: 2 }

/** La columna Hecho muestra por defecto solo lo completado en estos días. */
export const DIAS_HECHAS = 14

export type Vencimiento = 'vencida' | 'hoy' | 'proxima'

export function vencimiento(fecha: string | null, estado: EstadoTarea, hoy: string): Vencimiento | null {
  if (!fecha || estado === 'hecho') return null
  if (fecha < hoy) return 'vencida'
  if (fecha === hoy) return 'hoy'
  return 'proxima'
}

type Ordenable = Pick<Tarea, 'estado' | 'prioridad' | 'fecha_limite' | 'completada_at' | 'created_at'>

/**
 * Pendientes: vencidas primero, luego por fecha límite (sin fecha al final) y por prioridad.
 * Hechas: la última completada primero.
 */
export function ordenarTareas<T extends Ordenable>(tareas: T[], hoy: string): T[] {
  return tareas.slice().sort((a, b) => {
    if (a.estado === 'hecho' && b.estado === 'hecho') {
      return (b.completada_at ?? '').localeCompare(a.completada_at ?? '')
    }
    const va = vencimiento(a.fecha_limite, a.estado, hoy) === 'vencida' ? 0 : 1
    const vb = vencimiento(b.fecha_limite, b.estado, hoy) === 'vencida' ? 0 : 1
    if (va !== vb) return va - vb
    if (a.fecha_limite !== b.fecha_limite) {
      if (!a.fecha_limite) return 1
      if (!b.fecha_limite) return -1
      return a.fecha_limite.localeCompare(b.fecha_limite)
    }
    if (a.prioridad !== b.prioridad) return PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad]
    return a.created_at.localeCompare(b.created_at)
  })
}

export type FiltrosActivos = { cliente?: string; prioridad?: string; hechas?: string }

/** URL del tablero con estos filtros (sin ?tarea=). */
export function urlTareas(f: FiltrosActivos): string {
  const p = new URLSearchParams()
  if (f.cliente) p.set('cliente', f.cliente)
  if (f.prioridad) p.set('prioridad', f.prioridad)
  if (f.hechas) p.set('hechas', f.hechas)
  const qs = p.toString()
  return qs ? `/tareas?${qs}` : '/tareas'
}

/** "12 nov" (sin año) para las tarjetas; fecha YYYY-MM-DD. */
export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** Fecha YYYY-MM-DD en Madrid de un timestamptz. */
export function fechaMadrid(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(iso))
}
