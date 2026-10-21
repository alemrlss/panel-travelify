'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'
import { parseEurosACents } from '@/lib/formato'

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
  .optional()

const proyectoSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid(),
  nombre: z.string().min(1, 'Ponle un nombre al servicio'),
  tipo: z.enum([
    'agente_whatsapp',
    'agente_llamadas',
    'agente_web',
    'web',
    'mantenimiento_web',
    'seo_geo',
    'redes',
    'publicidad',
    'email_marketing',
    'crm_automatizaciones',
    'reputacion',
    'reactivacion',
    'otro',
  ]),
  estado: z.enum(['planificado', 'en_curso', 'en_revision', 'entregado', 'pausado']),
  fecha_inicio: fecha,
  fecha_entrega: fecha,
  // Lo que se cobra (opcional). Vacío = sin importe.
  importe: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null
      const cents = parseEurosACents(v)
      if (cents === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Importe no válido' })
        return z.NEVER
      }
      return cents
    }),
  cobro: z.enum(['mensual', 'trimestral', 'anual', 'unico']).default('unico'),
  url: z.string().url('El enlace tiene que empezar por https://').optional(),
  notas: z.string().optional(),
})

export async function guardarProyecto(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = proyectoSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, importe, ...datos } = parsed.data

  const fila = {
    ...datos,
    importe_cents: importe,
    fecha_inicio: datos.fecha_inicio ?? null,
    fecha_entrega: datos.fecha_entrega ?? null,
    url: datos.url ?? null,
    notas: datos.notas ?? null,
  }

  const supabase = await createClient()
  const { error } = id
    ? await supabase.from('proyectos').update(fila).eq('id', id)
    : await supabase.from('proyectos').insert(fila)
  if (error) return { error: `No se pudo guardar el servicio: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function eliminarProyecto(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('proyectos').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el servicio: ${error.message}`)
  revalidatePath('/', 'layout')
}
