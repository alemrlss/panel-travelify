'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { inicioDeMes, nombreMes, parseEurosACents } from '@/lib/formato'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')

const importe = z
  .string({ required_error: 'Falta el importe' })
  .transform((v, ctx) => {
    const cents = parseEurosACents(v)
    if (cents === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Importe no válido' })
      return z.NEVER
    }
    return cents
  })

// ─── Servicios contratados ───────────────────────────────────────────────────

const servicioSchema = z
  .object({
    id: z.string().uuid().optional(),
    cliente_id: z.string().uuid(),
    proyecto_id: z.string().uuid().optional(),
    concepto: z.string().min(1, 'Falta el concepto'),
    tipo_cobro: z.enum(['recurrente_mensual', 'unico']),
    importe,
    dia_cobro: z.coerce.number().int().min(1).max(28).optional(),
    fecha_inicio: fecha,
    fecha_fin: fecha.optional(),
  })
  .refine((s) => s.tipo_cobro === 'unico' || s.dia_cobro, {
    message: 'Indica el día de cobro (1 a 28)',
  })
  .refine((s) => !s.fecha_fin || s.fecha_fin >= s.fecha_inicio, {
    message: 'La fecha de fin no puede ser anterior al inicio',
  })

export async function guardarServicio(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = servicioSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, importe: importe_cents, ...datos } = parsed.data

  const fila = {
    ...datos,
    importe_cents,
    proyecto_id: datos.proyecto_id ?? null,
    dia_cobro: datos.tipo_cobro === 'unico' ? null : (datos.dia_cobro ?? null),
    fecha_fin: datos.fecha_fin ?? null,
  }

  const supabase = await createClient()

  if (id) {
    const { error } = await supabase.from('servicios_contratados').update(fila).eq('id', id)
    if (error) return { error: `No se pudo guardar el servicio: ${error.message}` }
  } else {
    const { data, error } = await supabase
      .from('servicios_contratados')
      .insert(fila)
      .select('id')
      .single()
    if (error || !data) return { error: `No se pudo crear el servicio: ${error?.message}` }

    // Un pago único genera su cobro pendiente al darse de alta, con vencimiento
    // en la fecha de inicio.
    if (fila.tipo_cobro === 'unico') {
      const { error: pagoError } = await supabase.from('pagos').insert({
        cliente_id: fila.cliente_id,
        servicio_id: data.id,
        concepto: fila.concepto,
        importe_cents,
        fecha_vencimiento: fila.fecha_inicio,
      })
      if (pagoError) {
        return { error: `Servicio creado, pero no su cobro pendiente: ${pagoError.message}` }
      }
    }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function setServicioActivo(id: string, activo: boolean) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('servicios_contratados').update({ activo }).eq('id', id)
  if (error) throw new Error(`No se pudo actualizar el servicio: ${error.message}`)
  revalidatePath('/', 'layout')
}

export async function eliminarServicio(id: string) {
  await requireUser()
  const supabase = await createClient()
  // Los pagos ya generados se conservan (servicio_id pasa a null por el FK).
  const { error } = await supabase.from('servicios_contratados').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el servicio: ${error.message}`)
  revalidatePath('/', 'layout')
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

const pagoSchema = z.object({
  cliente_id: z.string({ required_error: 'Elige un cliente' }).uuid('Elige un cliente'),
  concepto: z.string({ required_error: 'Falta el concepto' }).min(1),
  importe,
  fecha_vencimiento: fecha,
  notas: z.string().optional(),
})

export async function registrarPago(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = pagoSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { importe: importe_cents, ...datos } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('pagos')
    .insert({ ...datos, importe_cents, notas: datos.notas ?? null })
  if (error) return { error: `No se pudo registrar el cobro: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true }
}

const marcarPagadoSchema = z.object({
  id: z.string().uuid(),
  fecha_pago: fecha,
  metodo: z.string().optional(),
})

export async function marcarPagado(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = marcarPagadoSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, ...datos } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('pagos')
    .update({ estado: 'pagado', fecha_pago: datos.fecha_pago, metodo: datos.metodo ?? null })
    .eq('id', id)
  if (error) return { error: `No se pudo marcar como pagado: ${error.message}` }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function setEstadoPago(id: string, estado: 'pendiente' | 'anulado') {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('pagos')
    .update({ estado, fecha_pago: null, metodo: null })
    .eq('id', id)
  if (error) throw new Error(`No se pudo actualizar el cobro: ${error.message}`)
  revalidatePath('/', 'layout')
}

export async function eliminarPago(id: string) {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('pagos').delete().eq('id', id)
  if (error) throw new Error(`No se pudo eliminar el cobro: ${error.message}`)
  revalidatePath('/', 'layout')
}

/**
 * Crea un pago pendiente por cada servicio mensual activo y vigente en el mes.
 * Idempotente: el unique (servicio_id, periodo) + ignoreDuplicates hace que
 * pulsar dos veces no duplique cobros.
 */
export async function generarCobrosDelMes(
  _prev: Resultado,
  formData: FormData
): Promise<Resultado> {
  await requireUser()
  const periodo = String(formData.get('periodo') || inicioDeMes(0))
  if (!/^\d{4}-\d{2}-01$/.test(periodo)) return { error: 'Mes no válido' }
  const finDeMes = new Date(Date.UTC(+periodo.slice(0, 4), +periodo.slice(5, 7), 0))
    .toISOString()
    .slice(0, 10)

  const supabase = await createClient()
  const { data: servicios, error } = await supabase
    .from('servicios_contratados')
    .select('id, cliente_id, concepto, importe_cents, dia_cobro, fecha_inicio, fecha_fin')
    .eq('tipo_cobro', 'recurrente_mensual')
    .eq('activo', true)
    .lte('fecha_inicio', finDeMes)
    .or(`fecha_fin.is.null,fecha_fin.gte.${periodo}`)
  if (error) return { error: `No se pudieron leer los servicios: ${error.message}` }
  if (!servicios?.length) {
    return { ok: true, mensaje: 'No hay servicios mensuales activos para ese mes.' }
  }

  const etiqueta = nombreMes(periodo, true)
  const filas = servicios.map((s) => ({
    cliente_id: s.cliente_id,
    servicio_id: s.id,
    concepto: `${s.concepto} · ${etiqueta}`,
    importe_cents: s.importe_cents,
    periodo,
    fecha_vencimiento: `${periodo.slice(0, 8)}${String(s.dia_cobro ?? 1).padStart(2, '0')}`,
  }))

  const { data: creados, error: insertError } = await supabase
    .from('pagos')
    .upsert(filas, { onConflict: 'servicio_id,periodo', ignoreDuplicates: true })
    .select('id')
  if (insertError) return { error: `No se pudieron generar los cobros: ${insertError.message}` }

  revalidatePath('/', 'layout')
  const n = creados?.length ?? 0
  return {
    ok: true,
    mensaje:
      n === 0
        ? `Los cobros de ${etiqueta} ya estaban generados.`
        : `${n} cobro${n === 1 ? '' : 's'} de ${etiqueta} creado${n === 1 ? '' : 's'}.`,
  }
}
