'use server'

// Tareas del kanban y sus subtareas (checklist). No van al historial del cliente:
// son operativas. Si la tarea tiene servicio, el cliente sale del servicio.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'
import type { EstadoTarea } from '@/lib/supabase/types'

const ESTADOS = ['por_hacer', 'en_curso', 'hecho'] as const
const PRIORIDADES = ['alta', 'media', 'baja'] as const

const tareaSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().min(1, 'Ponle un título a la tarea').max(200, 'El título es demasiado largo'),
  descripcion: z.string().max(5000, 'La descripción es demasiado larga').optional(),
  estado: z.enum(ESTADOS).default('por_hacer'),
  prioridad: z.enum(PRIORIDADES).default('media'),
  fecha_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida').optional(),
  cliente_id: z.string().uuid().optional(),
  proyecto_id: z.string().uuid().optional(),
})

export async function guardarTarea(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = tareaSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, ...datos } = parsed.data
  const supabase = await createClient()

  let clienteId = datos.cliente_id ?? null
  if (datos.proyecto_id) {
    const { data: servicio } = await supabase
      .from('proyectos')
      .select('cliente_id')
      .eq('id', datos.proyecto_id)
      .maybeSingle()
    if (!servicio) return { error: 'El servicio ya no existe' }
    clienteId = servicio.cliente_id
  }

  // Conserva la fecha de completada si ya estaba hecha.
  let completadaAt: string | null = null
  if (datos.estado === 'hecho') {
    completadaAt = new Date().toISOString()
    if (id) {
      const { data: antes } = await supabase.from('tareas').select('estado, completada_at').eq('id', id).maybeSingle()
      if (antes?.estado === 'hecho' && antes.completada_at) completadaAt = antes.completada_at
    }
  }

  const fila = {
    titulo: datos.titulo,
    descripcion: datos.descripcion ?? null,
    estado: datos.estado,
    prioridad: datos.prioridad,
    fecha_limite: datos.fecha_limite ?? null,
    cliente_id: clienteId,
    proyecto_id: datos.proyecto_id ?? null,
    completada_at: completadaAt,
  }

  const { error } = id
    ? await supabase.from('tareas').update(fila).eq('id', id)
    : await supabase.from('tareas').insert(fila)
  if (error) return { error: `No se pudo guardar la tarea: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true }
}

const moverSchema = z.object({ id: z.string().uuid(), estado: z.enum(ESTADOS) })

/** Cambio de columna (arrastre o botón rápido). */
export async function moverTarea(id: string, estado: EstadoTarea) {
  await requireUser()
  const v = moverSchema.parse({ id, estado })
  const supabase = await createClient()
  const { error } = await supabase
    .from('tareas')
    .update({ estado: v.estado, completada_at: v.estado === 'hecho' ? new Date().toISOString() : null })
    .eq('id', v.id)
  if (error) throw new Error(`No se pudo mover la tarea: ${error.message}`)
  revalidatePath('/', 'layout')
}

export async function eliminarTarea(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('tareas').delete().eq('id', z.string().uuid().parse(id))
  if (error) throw new Error(`No se pudo eliminar la tarea: ${error.message}`)
  revalidatePath('/', 'layout')
}

const subtareaSchema = z.object({
  tarea_id: z.string().uuid(),
  texto: z.string().min(1, 'Escribe la subtarea').max(300, 'La subtarea es demasiado larga'),
})

export async function agregarSubtarea(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = subtareaSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const supabase = await createClient()

  const { data: ultima } = await supabase
    .from('tarea_subtareas')
    .select('orden')
    .eq('tarea_id', parsed.data.tarea_id)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { error } = await supabase
    .from('tarea_subtareas')
    .insert({ ...parsed.data, orden: (ultima?.orden ?? -1) + 1 })
  if (error) return { error: `No se pudo añadir la subtarea: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function marcarSubtarea(id: string, hecha: boolean) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('tarea_subtareas')
    .update({ hecha: z.boolean().parse(hecha) })
    .eq('id', z.string().uuid().parse(id))
  if (error) throw new Error(`No se pudo actualizar la subtarea: ${error.message}`)
  revalidatePath('/', 'layout')
}

export async function eliminarSubtarea(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('tarea_subtareas').delete().eq('id', z.string().uuid().parse(id))
  if (error) throw new Error(`No se pudo eliminar la subtarea: ${error.message}`)
  revalidatePath('/', 'layout')
}
