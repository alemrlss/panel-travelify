'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { actualizarOportunidad, getOpportunity, getPipelineStages, updateOpportunityStage } from '@/lib/ghl/client'
import { createClient } from '@/lib/supabase/server'
import { MOTIVOS_PERDIDA } from '@/lib/catalogos'
import { errorDeZod, leerForm, type Resultado } from '@/lib/acciones'
import { hoyISO, parseEurosACents } from '@/lib/formato'
import type { MotivoPerdida } from '@/lib/supabase/types'

export async function moveOpportunityStage(opportunityId: string, pipelineStageId: string) {
  await requireUser()
  await updateOpportunityStage(opportunityId, pipelineStageId)
  // Layout completo: el Dashboard también lee el pipeline (tasa de cierre).
  revalidatePath('/', 'layout')
}

const perdidaSchema = z.object({
  id: z.string().min(1),
  motivo: z.enum(Object.keys(MOTIVOS_PERDIDA) as [MotivoPerdida, ...MotivoPerdida[]], {
    message: 'Elige el motivo',
  }),
  detalle: z.string().max(500).optional(),
})

/**
 * Status "lost" en GHL + el motivo en Supabase (para saber por qué se pierden las ventas).
 * Si ya estaba perdida (marcada desde GHL o antes), solo apunta o corrige el motivo y
 * conserva la fecha y la etapa en que se perdió.
 */
export async function marcarPerdida(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const parsed = perdidaSchema.safeParse(leerForm(formData))
  if (!parsed.success) return errorDeZod(parsed.error)
  const { id, motivo, detalle } = parsed.data

  let nombre = id
  let etapa: string | null = null
  let yaPerdida = false
  let fechaPerdida = hoyISO()
  try {
    const [opp, pipeline] = await Promise.all([getOpportunity(id), getPipelineStages()])
    if (!opp) return { error: 'Oportunidad no encontrada' }
    nombre = opp.name || id
    etapa = pipeline?.stages.find((s) => s.id === opp.pipelineStageId)?.name ?? null
    yaPerdida = opp.status === 'lost'
    if (yaPerdida && opp.lastStatusChangeAt) fechaPerdida = opp.lastStatusChangeAt.slice(0, 10)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo leer la oportunidad' }
  }

  const supabase = await createClient()
  const { data: previa } = await supabase
    .from('oportunidades_perdidas')
    .select('fecha, etapa')
    .eq('ghl_opportunity_id', id)
    .maybeSingle()

  // Primero el motivo: si GHL falla después, se borra y no queda nada a medias.
  const { error } = await supabase.from('oportunidades_perdidas').upsert({
    ghl_opportunity_id: id,
    nombre,
    etapa: previa?.etapa ?? etapa,
    motivo,
    detalle: detalle ?? null,
    fecha: previa?.fecha ?? fechaPerdida,
  })
  if (error) return { error: `No se pudo guardar el motivo: ${error.message}` }

  if (!yaPerdida) {
    try {
      await actualizarOportunidad(id, { status: 'lost' })
    } catch (e) {
      await supabase.from('oportunidades_perdidas').delete().eq('ghl_opportunity_id', id)
      return { error: e instanceof Error ? e.message : 'No se pudo marcar como perdida' }
    }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Vuelve a abrir una oportunidad perdida (en la misma etapa) y olvida el motivo. */
export async function reabrirOportunidad(id: string) {
  await requireUser()
  await actualizarOportunidad(id, { status: 'open' })
  const supabase = await createClient()
  await supabase.from('oportunidades_perdidas').delete().eq('ghl_opportunity_id', id)
  revalidatePath('/', 'layout')
}

export async function guardarValorOportunidad(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const id = String(formData.get('id') ?? '')
  const texto = String(formData.get('valor') ?? '')
  const cents = texto.trim() === '' ? 0 : parseEurosACents(texto)
  if (!id || cents === null) return { error: 'Importe no válido' }
  try {
    await actualizarOportunidad(id, { monetaryValue: cents / 100 })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo guardar el valor' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}
