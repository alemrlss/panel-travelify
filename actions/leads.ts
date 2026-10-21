'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { getContact, getOpportunity } from '@/lib/ghl/client'
import { createClient } from '@/lib/supabase/server'
import { getContactoNombre } from '@/lib/formato'
import { recurrenteMensual } from '@/lib/servicios'
import { ESTADOS_CLIENTE, MOTIVOS_PERDIDA } from '@/lib/catalogos'
import type { GhlOpportunityStatus } from '@/lib/ghl/types'
import type { LeadNota } from '@/lib/supabase/types'

export type DetalleLead = {
  oportunidad: {
    id: string
    nombre: string
    status: GhlOpportunityStatus
    etapaId: string
    valor: number // euros
    creada: string
    enEtapaDesde: string | null
  }
  contacto: {
    id: string
    nombre: string
    empresa: string | null
    telefono: string | null
    email: string | null
    fuente: string | null
    etiquetas: string[]
    alta: string | null
  }
  cliente: {
    id: string
    empresa: string
    estado: string
    responsable: string | null
    telefono: string | null
    email: string | null
    recurrenteCents: number
    servicios: number
    desde: string
  } | null
  perdida: { motivo: string; detalle: string | null; fecha: string; etapa: string | null } | null
  notas: LeadNota[]
}

/** Todo lo que muestra el panel lateral del lead, en una llamada. */
export async function getDetalleLead(opportunityId: string): Promise<{ detalle?: DetalleLead; error?: string }> {
  await requireUser()
  try {
    const opp = await getOpportunity(opportunityId)
    if (!opp) return { error: 'Oportunidad no encontrada' }
    const contact = await getContact(opp.contactId)
    const supabase = await createClient()

    const [{ data: porContacto }, { data: porOportunidad }, { data: perdida }, { data: notas }] = await Promise.all([
      supabase.from('clientes').select('id, empresa, estado, fecha_inicio, responsable, telefono, email').eq('ghl_contact_id', opp.contactId).limit(1),
      supabase.from('clientes').select('id, empresa, estado, fecha_inicio, responsable, telefono, email').eq('ghl_opportunity_id', opp.id).limit(1),
      supabase.from('oportunidades_perdidas').select('*').eq('ghl_opportunity_id', opp.id).maybeSingle(),
      supabase
        .from('lead_notas')
        .select('*')
        .eq('ghl_contact_id', opp.contactId)
        .order('created_at', { ascending: false }),
    ])

    let cliente: DetalleLead['cliente'] = null
    const c = porContacto?.[0] ?? porOportunidad?.[0]
    if (c) {
      const { data: servicios } = await supabase
        .from('proyectos')
        .select('estado, cobro, importe_cents')
        .eq('cliente_id', c.id)
      cliente = {
        id: c.id,
        empresa: c.empresa,
        estado: ESTADOS_CLIENTE[c.estado].label,
        responsable: c.responsable,
        telefono: c.telefono,
        email: c.email,
        recurrenteCents: recurrenteMensual(servicios ?? []),
        servicios: servicios?.length ?? 0,
        desde: c.fecha_inicio,
      }
    }

    const nombre = getContactoNombre(contact)
    return {
      detalle: {
        oportunidad: {
          id: opp.id,
          nombre: opp.name || nombre,
          status: opp.status,
          etapaId: opp.pipelineStageId,
          valor: opp.monetaryValue ?? 0,
          creada: opp.createdAt,
          enEtapaDesde: opp.lastStageChangeAt ?? null,
        },
        contacto: {
          id: opp.contactId,
          nombre,
          // Si GHL no los tiene, los de la ficha de cliente (se editan ahí).
          empresa: contact?.companyName || cliente?.empresa || null,
          telefono: contact?.phone || cliente?.telefono || null,
          email: contact?.email || cliente?.email || null,
          fuente: contact?.source ?? null,
          etiquetas: contact?.tags ?? [],
          alta: contact?.dateAdded ?? null,
        },
        cliente,
        perdida: perdida
          ? { motivo: MOTIVOS_PERDIDA[perdida.motivo], detalle: perdida.detalle, fecha: perdida.fecha, etapa: perdida.etapa }
          : null,
        notas: notas ?? [],
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo cargar el lead' }
  }
}

export async function anadirNotaLead(input: {
  contactId: string
  opportunityId?: string
  texto: string
}): Promise<{ nota?: LeadNota; error?: string }> {
  await requireUser()
  const texto = input.texto.trim()
  if (!texto) return { error: 'Escribe la nota' }
  if (texto.length > 5000) return { error: 'La nota es demasiado larga (máx. 5.000 caracteres)' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_notas')
    .insert({ ghl_contact_id: input.contactId, ghl_opportunity_id: input.opportunityId ?? null, texto })
    .select('*')
    .single()
  if (error) return { error: `No se pudo guardar la nota: ${error.message}` }
  if (input.opportunityId) revalidatePath(`/pipeline/${input.opportunityId}`)
  return { nota: data }
}

export async function eliminarNotaLead(id: string): Promise<{ error?: string }> {
  await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('lead_notas').delete().eq('id', id)
  if (error) return { error: `No se pudo eliminar la nota: ${error.message}` }
  return {}
}
