'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'
import { formatFecha } from '@/lib/formato'
import { registrarEvento } from '@/lib/eventos'

const BUCKET = 'contratos'
// Ruta que genera el navegador: {cliente_id}/{uuid}.{ext}
const RUTA = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|doc|docx|jpg|png)$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Registra un archivo ya subido a Storage desde el navegador. Si falla, borra el archivo. */
export async function registrarContrato(input: {
  clienteId: string
  path: string
  nombre: string
  mime: string
  tamano: number
  fechaInicio: string
  fechaFin: string
}): Promise<{ error?: string }> {
  await requireUser()
  const supabase = await createClient()
  if (!RUTA.test(input.path) || !input.path.startsWith(`${input.clienteId}/`)) {
    return { error: 'Ruta de archivo no válida' }
  }
  const fechasOk = FECHA.test(input.fechaInicio) && FECHA.test(input.fechaFin) && input.fechaFin >= input.fechaInicio

  const { data, error } = fechasOk
    ? await supabase
        .from('contratos')
        .insert({
          cliente_id: input.clienteId,
          nombre: input.nombre.slice(0, 200),
          archivo_path: input.path,
          mime: input.mime,
          tamano_bytes: input.tamano,
          fecha_inicio: input.fechaInicio,
          fecha_fin: input.fechaFin,
        })
        .select('id')
        .single()
    : { data: null, error: { message: 'la fecha de fin no puede ser anterior a la de inicio' } }
  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([input.path])
    return { error: `No se pudo guardar "${input.nombre}": ${error?.message}` }
  }

  await registrarEvento(supabase, {
    cliente_id: input.clienteId,
    tipo: 'contrato_alta',
    descripcion: `Contrato «${input.nombre}» · vigente del ${formatFecha(input.fechaInicio)} al ${formatFecha(input.fechaFin)}`,
    fecha: input.fechaInicio,
    contrato_id: data.id,
  })
  revalidatePath(`/clientes/${input.clienteId}`)
  return {}
}

const bajaSchema = z.object({
  id: z.string().uuid(),
  fecha_baja: z.string().regex(FECHA, 'Fecha no válida'),
  motivo: z.string().optional(),
})

export async function darDeBajaContrato(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = bajaSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, fecha_baja, motivo } = parsed.data
  const supabase = await createClient()

  const { data: c } = await supabase.from('contratos').select('cliente_id, nombre').eq('id', id).maybeSingle()
  if (!c) return { error: 'El contrato ya no existe' }
  const { error } = await supabase.from('contratos').update({ estado: 'baja', fecha_baja }).eq('id', id)
  if (error) return { error: `No se pudo dar de baja el contrato: ${error.message}` }

  await registrarEvento(supabase, {
    cliente_id: c.cliente_id,
    tipo: 'contrato_baja',
    descripcion: `Contrato «${c.nombre}» dado de baja${motivo ? ` · ${motivo}` : ''}`,
    fecha: fecha_baja,
    contrato_id: id,
  })
  revalidatePath(`/clientes/${c.cliente_id}`)
  return { ok: true }
}

/** URL firmada de 5 minutos. Con `descargar` fuerza la descarga con el nombre original. */
export async function urlContrato(id: string, descargar = false): Promise<{ url?: string; error?: string }> {
  await requireUser()
  const supabase = await createClient()
  const { data: c } = await supabase.from('contratos').select('archivo_path, nombre').eq('id', id).maybeSingle()
  if (!c) return { error: 'El contrato ya no existe' }
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(c.archivo_path, 300, descargar ? { download: c.nombre } : undefined)
  if (error || !data) return { error: 'No se pudo abrir el archivo' }
  return { url: data.signedUrl }
}

export async function eliminarContrato(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { data: c } = await supabase.from('contratos').select('archivo_path, cliente_id, nombre').eq('id', id).maybeSingle()
  if (!c) return
  const { error } = await supabase.from('contratos').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el contrato: ${error.message}`)
  await supabase.storage.from(BUCKET).remove([c.archivo_path])
  await registrarEvento(supabase, {
    cliente_id: c.cliente_id,
    tipo: 'contrato_eliminado',
    descripcion: `Se eliminó el archivo del contrato «${c.nombre}»`,
  })
  revalidatePath(`/clientes/${c.cliente_id}`)
}
