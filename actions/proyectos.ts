'use server'

// "Servicios contratados" (la tabla sigue siendo proyectos). Cada cambio queda
// apuntado en el historial del cliente (cliente_eventos). Estados según el tipo
// de cobro: ver lib/servicios.ts.

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'
import { formatFecha, hoyISO, parseEurosACents } from '@/lib/formato'
import { registrarEvento } from '@/lib/eventos'
import { describirImporte, esRecurrente, estadoServicio, estadosPosibles, verboEstado } from '@/lib/servicios'
import { TIPOS_PROYECTO } from '@/lib/catalogos'
import type { EstadoProyecto } from '@/lib/supabase/types'

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')
const ESTADOS = ['planificado', 'en_curso', 'en_revision', 'entregado', 'baja'] as const

const servicioSchema = z.object({
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
  // Solo al crear un pago único. Los recurrentes empiezan siempre "En curso".
  estado: z.enum(['planificado', 'en_curso', 'en_revision', 'entregado']).optional(),
  fecha_inicio: fecha.optional(),
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
  const parsed = servicioSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, importe, estado, ...datos } = parsed.data

  const fila = {
    ...datos,
    importe_cents: importe,
    fecha_inicio: datos.fecha_inicio ?? null,
    url: datos.url ?? null,
    notas: datos.notas ?? null,
  }
  const supabase = await createClient()
  const hoy = hoyISO()

  if (!id) {
    const inicial: EstadoProyecto = esRecurrente(fila.cobro) ? 'en_curso' : (estado ?? 'planificado')
    const desde = fila.fecha_inicio ?? hoy
    const { data, error } = await supabase
      .from('proyectos')
      .insert({ ...fila, estado: inicial, estado_desde: desde })
      .select('id')
      .single()
    if (error || !data) return { error: `No se pudo guardar el servicio: ${error?.message}` }
    await registrarEvento(supabase, {
      cliente_id: fila.cliente_id,
      tipo: 'servicio_alta',
      descripcion: `Contrató «${fila.nombre}» · ${describirImporte(fila)}${
        esRecurrente(fila.cobro) ? '' : ` · ${estadoServicio(inicial, fila.cobro).label}`
      }`,
      fecha: desde,
      servicio_id: data.id,
    })
  } else {
    const { data: antes } = await supabase
      .from('proyectos')
      .select('nombre, tipo, importe_cents, cobro, estado')
      .eq('id', id)
      .maybeSingle()
    if (!antes) return { error: 'El servicio ya no existe' }

    // Si pasa a recurrente y estaba en un estado de pago único, queda "En curso".
    const ajusteEstado =
      !estadosPosibles(fila.cobro).includes(antes.estado) ? { estado: 'en_curso' as const, estado_desde: hoy } : {}
    const { error } = await supabase.from('proyectos').update({ ...fila, ...ajusteEstado }).eq('id', id)
    if (error) return { error: `No se pudo guardar el servicio: ${error.message}` }

    // Al historial solo lo que importa: precio/cobro, nombre, tipo y el ajuste de estado.
    const cambios: string[] = []
    if (antes.importe_cents !== fila.importe_cents || antes.cobro !== fila.cobro) {
      cambios.push(`precio de ${describirImporte(antes)} a ${describirImporte(fila)}`)
    }
    if (antes.nombre !== fila.nombre) cambios.push(`nombre de «${antes.nombre}» a «${fila.nombre}»`)
    if (antes.tipo !== fila.tipo) cambios.push(`tipo a ${TIPOS_PROYECTO[fila.tipo]}`)
    if ('estado' in ajusteEstado) cambios.push('estado a En curso (ahora es recurrente)')
    if (cambios.length) {
      await registrarEvento(supabase, {
        cliente_id: fila.cliente_id,
        tipo: 'servicio_cambio',
        descripcion: `«${fila.nombre}»: cambió ${cambios.join(', ')}`,
        servicio_id: id,
      })
    }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

const estadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(ESTADOS),
  fecha,
  motivo: z.string().optional(),
})

/** Cambio de estado con la fecha real en que pasó. Solo estados válidos para su tipo de cobro. */
export async function cambiarEstadoServicio(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = estadoSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, estado, fecha: cuando, motivo } = parsed.data
  const supabase = await createClient()

  const { data: s } = await supabase.from('proyectos').select('cliente_id, nombre, cobro, estado').eq('id', id).maybeSingle()
  if (!s) return { error: 'El servicio ya no existe' }
  if (!estadosPosibles(s.cobro).includes(estado)) {
    return { error: `Un servicio ${esRecurrente(s.cobro) ? 'recurrente' : 'de pago único'} no puede pasar a ese estado` }
  }
  const { error } = await supabase.from('proyectos').update({ estado, estado_desde: cuando }).eq('id', id)
  if (error) return { error: `No se pudo cambiar el estado: ${error.message}` }

  const verbo = verboEstado(estado, s.cobro, s.estado === 'baja')
  await registrarEvento(supabase, {
    cliente_id: s.cliente_id,
    tipo: 'servicio_estado',
    descripcion: `«${s.nombre}» ${verbo}${motivo ? ` · ${motivo}` : ''}`,
    fecha: cuando,
    servicio_id: id,
  })

  revalidatePath('/', 'layout')
  return { ok: true, mensaje: `«${s.nombre}» ${verbo} el ${formatFecha(cuando)}` }
}

export async function eliminarProyecto(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { data: s } = await supabase.from('proyectos').select('cliente_id, nombre').eq('id', id).maybeSingle()
  const { error } = await supabase.from('proyectos').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el servicio: ${error.message}`)
  if (s) {
    await registrarEvento(supabase, {
      cliente_id: s.cliente_id,
      tipo: 'servicio_eliminado',
      descripcion: `Se eliminó el servicio «${s.nombre}» del panel`,
    })
  }
  revalidatePath('/', 'layout')
}
