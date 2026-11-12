'use server'

// Plantillas de tareas recurrentes. Las tareas las crea la base (pg_cron cada mañana,
// migración 0013); aquí, tras guardar o reanudar, se llama a la RPC para que lo que
// toca hoy aparezca ya. Editar o borrar una plantilla no toca las tareas ya creadas.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'
import { hoyISO } from '@/lib/formato'
import { sumarDias } from '@/lib/recurrencias'

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
const entero = (min: number, max: number, msg: string) =>
  z.coerce.number({ invalid_type_error: msg }).int(msg).min(min, msg).max(max, msg)

const recurrenciaSchema = z
  .object({
    id: z.string().uuid().optional(),
    titulo: z.string().min(1, 'Ponle un título a la tarea').max(200, 'El título es demasiado largo'),
    descripcion: z.string().max(5000, 'La descripción es demasiado larga').optional(),
    prioridad: z.enum(['alta', 'media', 'baja']).default('media'),
    cliente_id: z.string().uuid().optional(),
    proyecto_id: z.string().uuid().optional(),
    tipo: z.enum(['cada_n_dias', 'dia_mes', 'dias_semana'], { message: 'Elige cómo se repite' }),
    cada_dias: entero(1, 365, 'Indica cada cuántos días (de 1 a 365)').optional(),
    dia_mes: entero(1, 31, 'Elige el día del mes').optional(),
    dias_semana: z.array(z.coerce.number().int().min(1).max(7)).default([]),
    plazo_dias: entero(0, 60, 'Plazo no válido').default(0),
    fecha_inicio: fecha.optional(),
    subtareas: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.tipo === 'cada_n_dias' && !v.cada_dias)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Indica cada cuántos días' })
    if (v.tipo === 'dia_mes' && !v.dia_mes) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Elige el día del mes' })
    if (v.tipo === 'dias_semana' && v.dias_semana.length === 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Marca al menos un día de la semana' })
  })

/** Genera ya lo que toca hoy. Si falla, el cron de mañana lo hará igual. */
async function generarAhora(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { error } = await supabase.rpc('generar_tareas_recurrentes')
  if (error) console.error('generar_tareas_recurrentes:', error.message)
  return !error
}

export async function guardarRecurrencia(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  // leerForm se queda con el último valor de cada clave: los checkboxes de días van aparte.
  const parsed = recurrenciaSchema.safeParse({
    ...leerForm(formData),
    dias_semana: formData.getAll('dias_semana').map(String),
  })
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, subtareas, ...v } = parsed.data
  const supabase = await createClient()
  const hoy = hoyISO()

  let clienteId = v.cliente_id ?? null
  if (v.proyecto_id) {
    const { data: servicio } = await supabase.from('proyectos').select('cliente_id').eq('id', v.proyecto_id).maybeSingle()
    if (!servicio) return { error: 'El servicio ya no existe' }
    clienteId = servicio.cliente_id
  }

  const pasos = (subtareas ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (pasos.length > 30) return { error: 'El checklist admite como máximo 30 pasos' }

  const fechaInicio = v.fecha_inicio ?? hoy
  const fila = {
    titulo: v.titulo,
    descripcion: v.descripcion ?? null,
    prioridad: v.prioridad,
    cliente_id: clienteId,
    proyecto_id: v.proyecto_id ?? null,
    subtareas: pasos,
    tipo: v.tipo,
    // Solo se guarda el campo de la regla elegida.
    cada_dias: v.tipo === 'cada_n_dias' ? v.cada_dias ?? null : null,
    dia_mes: v.tipo === 'dia_mes' ? v.dia_mes ?? null : null,
    dias_semana: v.tipo === 'dias_semana' ? [...new Set(v.dias_semana)].sort() : null,
    plazo_dias: v.plazo_dias,
    fecha_inicio: fechaInicio,
  }

  if (!id) {
    // Arranca desde hoy (o desde el inicio si es futuro): no rellena días pasados aunque
    // el inicio sea anterior (sirve para alinear "cada N días" con una fecha concreta).
    const ultima = [sumarDias(fechaInicio, -1), sumarDias(hoy, -1)].sort().at(-1)!
    const { error } = await supabase.from('tarea_recurrencias').insert({ ...fila, ultima_generacion: ultima })
    if (error) return { error: `No se pudo guardar la recurrente: ${error.message}` }
  } else {
    const { data: antes } = await supabase
      .from('tarea_recurrencias')
      .select('tipo, cada_dias, dia_mes, dias_semana, fecha_inicio, ultima_generacion')
      .eq('id', id)
      .maybeSingle()
    if (!antes) return { error: 'La recurrente ya no existe' }
    const cambioRegla =
      antes.tipo !== fila.tipo ||
      antes.cada_dias !== fila.cada_dias ||
      antes.dia_mes !== fila.dia_mes ||
      (antes.dias_semana ?? []).join() !== (fila.dias_semana ?? []).join() ||
      antes.fecha_inicio !== fila.fecha_inicio
    // Con la regla nueva no se rellenan días pasados: solo desde hoy.
    const ayer = sumarDias(hoy, -1)
    const ultima = cambioRegla
      ? [antes.ultima_generacion ?? ayer, ayer, sumarDias(fechaInicio, -1)].sort().at(-1)!
      : antes.ultima_generacion
    const { error } = await supabase
      .from('tarea_recurrencias')
      .update({ ...fila, ultima_generacion: ultima })
      .eq('id', id)
    if (error) return { error: `No se pudo guardar la recurrente: ${error.message}` }
  }

  const generado = await generarAhora(supabase)
  revalidatePath('/', 'layout')
  return generado
    ? { ok: true }
    : { ok: true, mensaje: 'Guardada. Las tareas se crearán mañana a primera hora.' }
}

/** Pausar / reanudar. Al reanudar no se recupera lo que tocaba mientras estuvo pausada. */
export async function pausarRecurrencia(id: string, activa: boolean) {
  await requireUser()
  const supabase = await createClient()
  const cambios = activa
    ? { activa: true, ultima_generacion: sumarDias(hoyISO(), -1) }
    : { activa: false }
  const { error } = await supabase
    .from('tarea_recurrencias')
    .update(cambios)
    .eq('id', z.string().uuid().parse(id))
  if (error) throw new Error(`No se pudo actualizar la recurrente: ${error.message}`)
  if (activa) await generarAhora(supabase)
  revalidatePath('/', 'layout')
}

/** Las tareas ya creadas se quedan en el tablero (recurrencia_id pasa a null). */
export async function eliminarRecurrencia(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('tarea_recurrencias').delete().eq('id', z.string().uuid().parse(id))
  if (error) throw new Error(`No se pudo eliminar la recurrente: ${error.message}`)
  revalidatePath('/', 'layout')
}
