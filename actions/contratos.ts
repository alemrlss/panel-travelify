'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'contratos'
// Ruta que genera el navegador: {cliente_id}/{uuid}.{ext}
const RUTA = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|doc|docx|jpg|png)$/

/** Registra un archivo ya subido a Storage desde el navegador. Si falla, borra el archivo. */
export async function registrarContrato(input: {
  clienteId: string
  path: string
  nombre: string
  mime: string
  tamano: number
}): Promise<{ error?: string }> {
  await requireUser()
  const supabase = await createClient()
  if (!RUTA.test(input.path) || !input.path.startsWith(`${input.clienteId}/`)) {
    return { error: 'Ruta de archivo no válida' }
  }

  const { error } = await supabase.from('contratos').insert({
    cliente_id: input.clienteId,
    nombre: input.nombre.slice(0, 200),
    archivo_path: input.path,
    mime: input.mime,
    tamano_bytes: input.tamano,
  })
  if (error) {
    await supabase.storage.from(BUCKET).remove([input.path])
    return { error: `No se pudo guardar "${input.nombre}": ${error.message}` }
  }

  revalidatePath(`/clientes/${input.clienteId}`)
  return {}
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
  const { data: c } = await supabase.from('contratos').select('archivo_path, cliente_id').eq('id', id).maybeSingle()
  if (!c) return
  const { error } = await supabase.from('contratos').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el contrato: ${error.message}`)
  await supabase.storage.from(BUCKET).remove([c.archivo_path])
  revalidatePath(`/clientes/${c.cliente_id}`)
}
