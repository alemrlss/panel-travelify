'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { hoyISO, parseEurosACents } from '@/lib/formato'
import { IRPF_OPCIONES, IVA_OPCIONES } from '@/lib/impuestos'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'

const BUCKET = 'facturas'
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')

const facturaSchema = z
  .object({
    id: z.string().uuid().optional(),
    tipo: z.enum(['venta', 'compra']),
    numero: z.string({ required_error: 'Falta el número de factura' }).min(1),
    fecha,
    cliente_id: z.string().uuid().optional(),
    proyecto_id: z.string().uuid().optional(),
    contraparte: z.string().optional(),
    concepto: z.string({ required_error: 'Falta el concepto' }).min(1),
    importe: z.string({ required_error: 'Falta el importe' }).transform((v, ctx) => {
      const cents = parseEurosACents(v)
      if (cents === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Importe no válido' })
        return z.NEVER
      }
      return cents
    }),
    iva_pct: z.coerce
      .number()
      .refine((n) => (IVA_OPCIONES as readonly number[]).includes(n), 'IVA no válido')
      .default(21),
    irpf_pct: z.coerce
      .number()
      .refine((n) => (IRPF_OPCIONES as readonly number[]).includes(n), 'IRPF no válido')
      .default(0),
    pagada: z.string().optional(),
    fecha_pago: fecha.optional(),
    pdf_path: z.string().optional(),
    notas: z.string().optional(),
  })
  .refine((f) => f.cliente_id || f.contraparte, {
    message: 'Indica el cliente o el proveedor',
  })

export async function guardarFactura(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = facturaSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const d = parsed.data
  const supabase = await createClient()

  // En una venta a un cliente del CRM, la contraparte es su nombre en el panel.
  let contraparte = d.contraparte ?? ''
  const clienteId = d.tipo === 'venta' ? (d.cliente_id ?? null) : null
  if (clienteId) {
    const { data: c } = await supabase
      .from('clientes')
      .select('nombre_cache')
      .eq('id', clienteId)
      .maybeSingle()
    if (!c) return { error: 'El cliente elegido ya no existe' }
    contraparte = c.nombre_cache
  }

  const pagada = d.pagada === 'on'
  const fila = {
    tipo: d.tipo,
    numero: d.numero,
    fecha: d.fecha,
    cliente_id: clienteId,
    proyecto_id: d.tipo === 'venta' ? (d.proyecto_id ?? null) : null,
    contraparte,
    concepto: d.concepto,
    total_cents: d.importe,
    iva_pct: d.iva_pct,
    irpf_pct: d.irpf_pct,
    estado: pagada ? ('pagada' as const) : ('pendiente' as const),
    fecha_pago: pagada ? (d.fecha_pago ?? hoyISO()) : null,
    notas: d.notas ?? null,
  }

  let pdfAnterior: string | null = null
  if (d.id) {
    const { data: actual } = await supabase.from('facturas').select('pdf_path').eq('id', d.id).maybeSingle()
    pdfAnterior = actual?.pdf_path ?? null
  }

  // pdf_path solo viaja cuando se sube un archivo nuevo; si no, se conserva el que había.
  const conPdf = d.pdf_path ? { ...fila, pdf_path: d.pdf_path } : fila
  const { error } = d.id
    ? await supabase.from('facturas').update(conPdf).eq('id', d.id)
    : await supabase.from('facturas').insert(conPdf)

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una factura de venta con ese número' }
    return { error: `No se pudo guardar la factura: ${error.message}` }
  }

  if (d.pdf_path && pdfAnterior && pdfAnterior !== d.pdf_path) {
    await supabase.storage.from(BUCKET).remove([pdfAnterior])
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

const pagadaSchema = z.object({ id: z.string().uuid(), fecha_pago: fecha })

export async function marcarFacturaPagada(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = pagadaSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from('facturas')
    .update({ estado: 'pagada', fecha_pago: parsed.data.fecha_pago })
    .eq('id', parsed.data.id)
  if (error) return { error: `No se pudo actualizar la factura: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function marcarFacturaPendiente(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('facturas')
    .update({ estado: 'pendiente', fecha_pago: null })
    .eq('id', id)
  if (error) throw new Error(`No se pudo actualizar la factura: ${error.message}`)
  revalidatePath('/', 'layout')
}

export async function eliminarFactura(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { data: f } = await supabase.from('facturas').select('pdf_path').eq('id', id).maybeSingle()
  const { error } = await supabase.from('facturas').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar la factura: ${error.message}`)
  if (f?.pdf_path) await supabase.storage.from(BUCKET).remove([f.pdf_path])
  revalidatePath('/', 'layout')
}

/** URL firmada de 5 minutos para ver el PDF de una factura. */
export async function urlPdfFactura(id: string): Promise<{ url?: string; error?: string }> {
  await requireUser()
  const supabase = await createClient()
  const { data: f } = await supabase.from('facturas').select('pdf_path').eq('id', id).maybeSingle()
  if (!f?.pdf_path) return { error: 'Esta factura no tiene PDF adjunto' }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.pdf_path, 300)
  if (error || !data) return { error: 'No se pudo abrir el PDF' }
  return { url: data.signedUrl }
}

/** Borra un archivo recién subido cuando la factura no llegó a guardarse. */
export async function descartarPdf(path: string) {
  await requireUser()
  if (!/^(venta|compra)\/\d{4}\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$/.test(path)) return
  const supabase = await createClient()
  await supabase.storage.from(BUCKET).remove([path])
}
