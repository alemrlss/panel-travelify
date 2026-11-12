// Reglas de las tareas recurrentes, solo para mostrar ("Cada 5 días · próxima el 17 nov").
// La fuente de verdad es private.toca_recurrencia (migración 0013): mantener la misma lógica.

import type { TareaRecurrencia } from '@/lib/supabase/types'
import { fechaCorta } from '@/lib/tareas'

export const DIAS_SEMANA = [
  { n: 1, corto: 'L', label: 'Lunes' },
  { n: 2, corto: 'M', label: 'Martes' },
  { n: 3, corto: 'X', label: 'Miércoles' },
  { n: 4, corto: 'J', label: 'Jueves' },
  { n: 5, corto: 'V', label: 'Viernes' },
  { n: 6, corto: 'S', label: 'Sábado' },
  { n: 7, corto: 'D', label: 'Domingo' },
] as const

export const PLAZOS = [
  { dias: 0, label: 'El mismo día' },
  { dias: 1, label: '1 día' },
  { dias: 2, label: '2 días' },
  { dias: 3, label: '3 días' },
  { dias: 5, label: '5 días' },
  { dias: 7, label: '1 semana' },
] as const

type Regla = Pick<TareaRecurrencia, 'tipo' | 'cada_dias' | 'dia_mes' | 'dias_semana' | 'fecha_inicio'>

const DIA_MS = 86_400_000
const aMs = (f: string) => Date.parse(`${f}T00:00:00Z`)
const aFecha = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function sumarDias(fecha: string, n: number): string {
  return aFecha(aMs(fecha) + n * DIA_MS)
}

export function tocaEl(r: Regla, fecha: string): boolean {
  if (fecha < r.fecha_inicio) return false
  const d = new Date(aMs(fecha))
  switch (r.tipo) {
    case 'cada_n_dias': {
      if (!r.cada_dias) return false
      const dias = Math.round((aMs(fecha) - aMs(r.fecha_inicio)) / DIA_MS)
      return dias % r.cada_dias === 0
    }
    case 'dia_mes': {
      if (!r.dia_mes) return false
      const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
      return d.getUTCDate() === Math.min(r.dia_mes, ultimo)
    }
    case 'dias_semana': {
      const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
      return (r.dias_semana ?? []).includes(iso)
    }
  }
}

/** Próxima fecha en que se creará la tarea (si hoy ya se generó, desde mañana). */
export function proximaFecha(
  r: Regla & Partial<Pick<TareaRecurrencia, 'ultima_generacion'>>,
  hoy: string
): string | null {
  let f = r.fecha_inicio > hoy ? r.fecha_inicio : hoy
  if (r.ultima_generacion && r.ultima_generacion >= f) f = sumarDias(r.ultima_generacion, 1)
  for (let i = 0; i < 400; i++) {
    if (tocaEl(r, f)) return f
    f = sumarDias(f, 1)
  }
  return null
}

export function describirRegla(r: Regla & Partial<Pick<TareaRecurrencia, 'plazo_dias'>>): string {
  let texto: string
  switch (r.tipo) {
    case 'cada_n_dias':
      texto = r.cada_dias === 1 ? 'Cada día' : `Cada ${r.cada_dias ?? '?'} días`
      break
    case 'dia_mes':
      texto = r.dia_mes === 31 ? 'El último día de cada mes' : `El día ${r.dia_mes ?? '?'} de cada mes`
      break
    case 'dias_semana': {
      const dias = (r.dias_semana ?? []).slice().sort((a, b) => a - b)
      if (dias.length === 7) texto = 'Todos los días'
      else if (dias.join() === '1,2,3,4,5') texto = 'De lunes a viernes'
      else {
        const nombres = dias.map((n) => DIAS_SEMANA[n - 1]?.label.toLowerCase() ?? '?')
        const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0] ?? '—'
        texto = `Cada ${lista}`
      }
      break
    }
  }
  if (r.plazo_dias) texto += ` · plazo ${r.plazo_dias} ${r.plazo_dias === 1 ? 'día' : 'días'}`
  return texto
}

/** "Próxima: 17 nov" / "Pausada". */
export function textoProxima(
  r: Regla & Pick<TareaRecurrencia, 'activa' | 'ultima_generacion'>,
  hoy: string
): string {
  if (!r.activa) return 'Pausada'
  const p = proximaFecha(r, hoy)
  if (!p) return 'Sin próximas fechas'
  return p === hoy ? 'Próxima: hoy' : `Próxima: ${fechaCorta(p)}`
}
