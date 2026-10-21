'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getOpportunity, marcarOportunidadGanada } from '@/lib/ghl/client'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'
import { registrarEvento } from '@/lib/eventos'

// Datos propios del cliente (viven en Supabase, no se leen de GHL).
const datosCliente = {
  empresa: z.string({ required_error: 'Falta el nombre de la empresa' }).min(1, 'Falta el nombre de la empresa'),
  responsable: z.string({ required_error: 'Falta el nombre del responsable' }).min(1, 'Falta el nombre del responsable'),
  telefono: z.string().optional(),
  email: z.string().email('El email no es válido').optional(),
}

const nuevoSchema = z.object(datosCliente)

/** Alta manual (cliente que no viene del pipeline). */
export async function crearCliente(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = nuevoSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const d = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...d, telefono: d.telefono ?? null, email: d.email ?? null })
    .select('id')
    .single()
  if (error || !data) return { error: `No se pudo crear el cliente: ${error?.message}` }
  await registrarEvento(supabase, { cliente_id: data.id, tipo: 'cliente_alta', descripcion: 'Alta como cliente (manual)' })

  revalidatePath('/', 'layout')
  redirect(`/clientes/${data.id}`)
}

const convertirSchema = z.object({
  ...datosCliente,
  ghl_contact_id: z.string().min(1),
  ghl_opportunity_id: z.string().min(1),
})

/**
 * Lead del pipeline → cliente. Crea la ficha en Supabase y deja la oportunidad
 * Ganada en GHL (status won + etapa "Ganado…"). Si GHL falla, se deshace el
 * alta para no quedar a medias.
 */
export async function convertirEnCliente(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = convertirSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const d = parsed.data
  const supabase = await createClient()

  const { data: existente } = await supabase
    .from('clientes')
    .select('id')
    .eq('ghl_contact_id', d.ghl_contact_id)
    .maybeSingle()
  if (existente) redirect(`/clientes/${existente.id}`)

  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...d, telefono: d.telefono ?? null, email: d.email ?? null })
    .select('id')
    .single()
  if (error || !data) return { error: `No se pudo crear el cliente: ${error?.message}` }

  try {
    await marcarOportunidadGanada(d.ghl_opportunity_id)
  } catch {
    await supabase.from('clientes').delete().eq('id', data.id)
    return { error: 'No se pudo marcar la oportunidad como ganada en el pipeline. No se ha creado el cliente; inténtalo de nuevo.' }
  }
  await registrarEvento(supabase, {
    cliente_id: data.id,
    tipo: 'cliente_alta',
    descripcion: 'Alta como cliente desde el pipeline · oportunidad marcada como Ganada',
  })

  revalidatePath('/', 'layout')
  redirect(`/clientes/${data.id}`)
}

const vincularSchema = z.object({
  cliente_id: z.string().uuid(),
  opportunity_id: z.string({ required_error: 'Elige una oportunidad' }).min(1, 'Elige una oportunidad'),
})

/**
 * Cliente creado a mano → lo vincula con su oportunidad del pipeline y la deja
 * Ganada en GHL, para que no siga contando como lead abierto.
 */
export async function vincularOportunidad(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = vincularSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { cliente_id, opportunity_id } = parsed.data
  const supabase = await createClient()

  const opp = await getOpportunity(opportunity_id).catch(() => undefined)
  if (!opp) return { error: 'No se encontró la oportunidad en el pipeline' }
  const { data: otro } = await supabase
    .from('clientes')
    .select('empresa')
    .eq('ghl_contact_id', opp.contactId)
    .neq('id', cliente_id)
    .maybeSingle()
  if (otro) return { error: `Ese contacto ya está vinculado al cliente ${otro.empresa}` }

  let etapa: string | undefined
  try {
    etapa = await marcarOportunidadGanada(opportunity_id)
  } catch {
    return { error: 'No se pudo marcar la oportunidad como ganada en el pipeline. Inténtalo de nuevo.' }
  }
  const { error } = await supabase
    .from('clientes')
    .update({ ghl_contact_id: opp.contactId, ghl_opportunity_id: opportunity_id })
    .eq('id', cliente_id)
  if (error) return { error: `La oportunidad quedó Ganada, pero no se pudo vincular: ${error.message}` }

  await registrarEvento(supabase, {
    cliente_id,
    tipo: 'cliente_vinculado',
    descripcion: `Vinculado con la oportunidad «${opp.name}» del pipeline · marcada como Ganada${etapa ? ` (${etapa})` : ''}`,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

const notaSchema = z.object({
  cliente_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida'),
  descripcion: z.string({ required_error: 'Escribe la nota' }).min(1, 'Escribe la nota').max(2000),
})

/** Nota manual en el historial: llamada, reunión, incidencia… */
export async function anadirNota(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = notaSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.from('cliente_eventos').insert({ ...parsed.data, tipo: 'nota' })
  if (error) return { error: `No se pudo guardar la nota: ${error.message}` }
  revalidatePath(`/clientes/${parsed.data.cliente_id}`)
  return { ok: true }
}

export async function eliminarNota(id: string) {
  await requireUser()
  const supabase = await createClient()
  // Solo se borran notas manuales; el resto del historial es automático.
  const { data } = await supabase.from('cliente_eventos').delete().eq('id', id).eq('tipo', 'nota').select('cliente_id')
  revalidatePath(`/clientes/${data?.[0]?.cliente_id ?? ''}`)
}

const actualizarSchema = z.object({
  id: z.string().uuid(),
  ...datosCliente,
  // El estado se cambia con "Dar de baja" / "Reactivar" (queda en el historial).
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio no válida'),
  notas: z.string().optional(),
})

export async function actualizarCliente(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = actualizarSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, ...cambios } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('clientes')
    .update({
      ...cambios,
      telefono: cambios.telefono ?? null,
      email: cambios.email ?? null,
      notas: cambios.notas ?? null,
    })
    .eq('id', id)
  if (error) return { error: `No se pudo guardar: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true, mensaje: 'Cambios guardados' }
}

/** Dar de baja (estado "finalizado", se muestra "De baja") o reactivar. */
export async function setEstadoCliente(id: string, estado: 'activo' | 'finalizado') {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('clientes').update({ estado }).eq('id', id)
  if (error) throw new Error(`No se pudo cambiar el estado: ${error.message}`)
  await registrarEvento(supabase, {
    cliente_id: id,
    tipo: estado === 'activo' ? 'cliente_reactivado' : 'cliente_baja',
    descripcion: estado === 'activo' ? 'Cliente reactivado' : 'Cliente dado de baja',
  })
  revalidatePath('/', 'layout')
}

export async function eliminarCliente(id: string) {
  await requireUser()
  const supabase = await createClient()
  // Los archivos de sus contratos no se borran solos con la cascada de la tabla.
  const { data: contratos } = await supabase.from('contratos').select('archivo_path').eq('cliente_id', id)
  if (contratos?.length) await supabase.storage.from('contratos').remove(contratos.map((c) => c.archivo_path))
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el cliente: ${error.message}`)
  revalidatePath('/', 'layout')
  redirect('/clientes')
}
