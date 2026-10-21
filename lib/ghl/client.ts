import 'server-only'
import type {
  GhlContact,
  GhlOpportunity,
  GhlOpportunityStatus,
  GhlPipeline,
  GhlSearchMeta,
} from './types'

const BASE_URL = 'https://services.leadconnectorhq.com'
const LOCATION_ID = process.env.GHL_LOCATION_ID
const TOKEN = process.env.GHL_PRIVATE_TOKEN

async function ghlFetch<T>(
  path: string,
  init: RequestInit & { version?: string } = {}
): Promise<T> {
  if (!TOKEN || !LOCATION_ID) {
    throw new Error('La conexión con el CRM no está configurada todavía en el servidor.')
  }

  const { version = '2021-07-28', ...rest } = init

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Version: version,
      Accept: 'application/json',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...rest.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    // El detalle completo (incluida la ruta interna) queda en el log del
    // servidor para debug — el mensaje visible en la UI no nombra GHL.
    console.error(`GHL API ${path} → ${res.status}: ${body}`)
    throw new Error('No se pudo obtener la información del CRM en este momento.')
  }

  return res.json() as Promise<T>
}

export async function getPipelineStages(): Promise<GhlPipeline | undefined> {
  const data = await ghlFetch<{ pipelines: GhlPipeline[] }>(
    `/opportunities/pipelines?locationId=${LOCATION_ID}`
  )
  return data.pipelines.find((p) => p.id === process.env.GHL_PIPELINE_ID) ?? data.pipelines[0]
}

function opportunitiesQuery(params: {
  status?: GhlOpportunityStatus
  pipelineStageId?: string
  contactId?: string
  limit?: number
  page?: number
}) {
  const query = new URLSearchParams({
    location_id: LOCATION_ID ?? '',
    pipeline_id: process.env.GHL_PIPELINE_ID ?? '',
    limit: String(params.limit ?? 100),
  })
  if (params.status) query.set('status', params.status)
  if (params.pipelineStageId) query.set('pipeline_stage_id', params.pipelineStageId)
  if (params.contactId) query.set('contact_id', params.contactId)
  if (params.page) query.set('page', String(params.page))
  return query
}

export async function searchOpportunities(params: {
  status?: GhlOpportunityStatus
  pipelineStageId?: string
  contactId?: string
  limit?: number
}): Promise<GhlOpportunity[]> {
  const data = await ghlFetch<{ opportunities: GhlOpportunity[] }>(
    `/opportunities/search?${opportunitiesQuery(params).toString()}`
  )
  return data.opportunities ?? []
}

/** Pagina hasta traer todas las oportunidades del pipeline (tope de seguridad: 20 páginas). */
export async function searchOpportunitiesAll(params: {
  status?: GhlOpportunityStatus
}): Promise<GhlOpportunity[]> {
  const todas: GhlOpportunity[] = []
  for (let page = 1; page <= 20; page++) {
    const data = await ghlFetch<{ opportunities: GhlOpportunity[]; meta?: GhlSearchMeta }>(
      `/opportunities/search?${opportunitiesQuery({ ...params, page }).toString()}`
    )
    const lote = data.opportunities ?? []
    todas.push(...lote)
    if (lote.length < 100 || !data.meta?.nextPage) break
  }
  return todas
}

export async function getOpportunity(opportunityId: string): Promise<GhlOpportunity | undefined> {
  const data = await ghlFetch<{ opportunity: GhlOpportunity }>(`/opportunities/${opportunityId}`)
  return data.opportunity
}

export async function updateOpportunityStage(
  opportunityId: string,
  pipelineStageId: string
): Promise<void> {
  await ghlFetch(`/opportunities/${opportunityId}`, {
    method: 'PUT',
    body: JSON.stringify({ pipelineStageId }),
  })
}

export async function getContact(contactId: string): Promise<GhlContact | undefined> {
  const data = await ghlFetch<{ contact: GhlContact }>(`/contacts/${contactId}`)
  return data.contact
}

/**
 * Al convertir un lead en cliente: la oportunidad pasa a status "won" y se mueve
 * a la etapa de ganados del pipeline (la que se llame "Ganado…"; si no hay,
 * la última). Devuelve el nombre de la etapa destino.
 */
export async function marcarOportunidadGanada(opportunityId: string): Promise<string | undefined> {
  const pipeline = await getPipelineStages()
  const etapas = (pipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position)
  const ganado = etapas.find((s) => /ganad/i.test(s.name)) ?? etapas[etapas.length - 1]
  await ghlFetch(`/opportunities/${opportunityId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'won', ...(ganado ? { pipelineStageId: ganado.id } : {}) }),
  })
  return ganado?.name
}
