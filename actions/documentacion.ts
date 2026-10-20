'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { slugificar } from '@/lib/documentacion'
import type { Resultado } from '@/lib/acciones'

const docSchema = z.object({
  id: z.string().uuid().optional(),
  titulo: z.string().trim().min(1, 'Ponle un título al documento').max(160),
  categoria: z.enum(['procesos', 'tecnico', 'ventas', 'clientes', 'herramientas', 'otros']),
  contenido: z.string().max(200_000, 'El documento es demasiado largo'),
})

export async function guardarDocumento(
  _prev: Resultado & { slug?: string },
  formData: FormData
): Promise<Resultado & { slug?: string }> {
  await requireUser()
  // Sin leerForm: el contenido conserva espacios y saltos de línea tal cual.
  const parsed = docSchema.safeParse({
    id: formData.get('id') || undefined,
    titulo: formData.get('titulo') ?? '',
    categoria: formData.get('categoria') ?? 'procesos',
    contenido: formData.get('contenido') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revisa el formulario' }
  const { id, ...datos } = parsed.data
  const supabase = await createClient()

  if (id) {
    // Al renombrar el slug se mantiene: no se rompen los enlaces al documento.
    const { data, error } = await supabase.from('documentos').update(datos).eq('id', id).select('slug').single()
    if (error || !data) return { error: `No se pudo guardar: ${error?.message}` }
    revalidatePath('/documentacion', 'layout')
    return { ok: true, slug: data.slug }
  }

  const base = slugificar(datos.titulo)
  const { data: parecidos } = await supabase.from('documentos').select('slug').like('slug', `${base}%`)
  // "nuevo" está reservado: es la ruta /documentacion/nuevo.
  const usados = new Set(['nuevo', ...(parecidos?.map((d) => d.slug) ?? [])])
  let slug = base
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`

  const { error } = await supabase.from('documentos').insert({ ...datos, slug })
  if (error) return { error: `No se pudo crear el documento: ${error.message}` }

  revalidatePath('/documentacion', 'layout')
  return { ok: true, slug }
}

export async function setFijado(id: string, fijado: boolean) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('documentos').update({ fijado }).eq('id', id)
  if (error) throw new Error(`No se pudo actualizar: ${error.message}`)
  revalidatePath('/documentacion', 'layout')
}

export async function eliminarDocumento(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('documentos').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar: ${error.message}`)
  revalidatePath('/documentacion', 'layout')
  redirect('/documentacion')
}
