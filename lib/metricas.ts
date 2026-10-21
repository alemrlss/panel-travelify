import 'server-only'
import { getPipelineStages, searchOpportunitiesAll } from '@/lib/ghl/client'
import { getContactoNombre, hoyISO, inicioDeMes } from '@/lib/formato'

const DIA = 24 * 60 * 60 * 1000
/** Días sin cambiar de etapa a partir de los cuales una oportunidad abierta se marca "sin movimiento". */
export const DIAS_SIN_MOVIMIENTO = 14

/**
 * Todo lo que el Dashboard mide del pipeline de GHL, en una sola lectura:
 * embudo por etapa, tasa de cierre (90 días), actividad del mes y oportunidades
 * abiertas que llevan tiempo sin moverse. monetaryValue viene en euros.
 */
export async function getResumenPipeline() {
  const [pipeline, opps] = await Promise.all([getPipelineStages(), searchOpportunitiesAll({})])
  const ahora = Date.now()
  const hace90 = new Date(ahora - 90 * DIA).toISOString()
  // Inicio del mes en Madrid; la comparación con ISO UTC tiene un margen de horas, aceptable.
  const mes = `${inicioDeMes(0, hoyISO())}T00:00:00`

  const abiertas = opps.filter((o) => o.status === 'open')
  const cambioEstado = (o: (typeof opps)[number]) => o.lastStatusChangeAt ?? o.updatedAt ?? o.createdAt
  const cerradas90 = opps.filter((o) => o.status !== 'open' && cambioEstado(o) >= hace90)
  const won90 = cerradas90.filter((o) => o.status === 'won').length
  const lost90 = cerradas90.length - won90

  const etapas = (pipeline?.stages ?? []).slice().sort((a, b) => a.position - b.position)
  const porEtapa = etapas.map((s) => {
    const enEtapa = abiertas.filter((o) => o.pipelineStageId === s.id)
    return {
      id: s.id,
      nombre: s.name,
      color: s.color,
      n: enEtapa.length,
      valor: enEtapa.reduce((t, o) => t + (o.monetaryValue ?? 0), 0),
    }
  })

  const sinMovimiento = abiertas
    .map((o) => {
      const desde = o.lastStageChangeAt ?? o.updatedAt ?? o.createdAt
      return {
        id: o.id,
        nombre: o.name || getContactoNombre(o.contact),
        etapa: etapas.find((s) => s.id === o.pipelineStageId)?.name ?? '—',
        valor: o.monetaryValue ?? 0,
        dias: Math.floor((ahora - Date.parse(desde)) / DIA),
      }
    })
    .filter((o) => o.dias >= DIAS_SIN_MOVIMIENTO)
    .sort((a, b) => b.dias - a.dias)

  return {
    pipelineNombre: pipeline?.name ?? 'Pipeline',
    abiertas: abiertas.length,
    valorAbierto: abiertas.reduce((t, o) => t + (o.monetaryValue ?? 0), 0),
    won90,
    lost90,
    tasa: won90 + lost90 > 0 ? won90 / (won90 + lost90) : null,
    porEtapa,
    mes: {
      nuevas: opps.filter((o) => o.createdAt >= mes).length,
      ganadas: opps.filter((o) => o.status === 'won' && cambioEstado(o) >= mes).length,
      perdidas: opps.filter((o) => (o.status === 'lost' || o.status === 'abandoned') && cambioEstado(o) >= mes).length,
      valorGanado: opps
        .filter((o) => o.status === 'won' && cambioEstado(o) >= mes)
        .reduce((t, o) => t + (o.monetaryValue ?? 0), 0),
    },
    sinMovimiento,
  }
}
