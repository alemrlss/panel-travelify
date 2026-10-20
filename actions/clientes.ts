'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { searchContacts } from '@/lib/ghl/client'
import { getContactoNombre } from '@/lib/formato'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'

export interface ContactoEncontrado {
  id: string
  nombre: string
  detalle: string
  clienteId: string | null
}

export async function buscarContactos(query: string): Promise<{
  contactos: ContactoEncontrado[]
  error?: string
}> {
  await requireUser()
  try {
    const contactos = await searchContacts(query)
    const supabase = await createClient()
    const { data: existentes } = await supabase
      .from('clientes')
      .select('id, ghl_contact_id')
      .in(
        'ghl_contact_id',
        contactos.map((c) => c.id)
      )
    const porContacto = new Map(existentes?.map((c) => [c.ghl_contact_id, c.id]))

    return {
      contactos: contactos.map((c) => ({
        id: c.id,
        nombre: getContactoNombre(c),
        detalle: [c.companyName, c.email, c.phone].filter(Boolean).join(' · '),
        clienteId: porContacto.get(c.id) ?? null,
      })),
    }
  } catch (e) {
    return { contactos: [], error: e instanceof Error ? e.message : 'No se pudo buscar' }
  }
}

const crearSchema = z.object({
  ghlContactId: z.string().min(1),
  ghlOpportunityId: z.string().optional(),
  nombre: z.string().min(1, 'Falta el nombre del cliente'),
})

/** Crea la ficha del cliente (o reutiliza la existente) y redirige a ella. */
export async function crearCliente(input: z.input<typeof crearSchema>) {
  await requireUser()
  const datos = crearSchema.parse(input)
  const supabase = await createClient()

  const { data: existente } = await supabase
    .from('clientes')
    .select('id')
    .eq('ghl_contact_id', datos.ghlContactId)
    .maybeSingle()

  let id = existente?.id
  if (!id) {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        ghl_contact_id: datos.ghlContactId,
        ghl_opportunity_id: datos.ghlOpportunityId ?? null,
        nombre_cache: datos.nombre,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`No se pudo crear el cliente: ${error?.message}`)
    id = data.id
  }

  revalidatePath('/', 'layout')
  redirect(`/clientes/${id}`)
}

const actualizarSchema = z.object({
  id: z.string().uuid(),
  nombre_cache: z.string().min(1, 'El nombre no puede quedar vacío'),
  estado: z.enum(['activo', 'pausado', 'finalizado']),
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
    .update({ ...cambios, notas: cambios.notas ?? null })
    .eq('id', id)
  if (error) return { error: `No se pudo guardar: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true, mensaje: 'Cambios guardados' }
}

export async function eliminarCliente(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el cliente: ${error.message}`)
  revalidatePath('/', 'layout')
  redirect('/clientes')
}
