import 'server-only'
import { getPipelineStages, searchOpportunitiesAll } from '@/lib/ghl/client'
import { getContactoNombre, hoyISO, inicioDeMes } from '@/lib/formato'

const DIA = 24 * 60 * 60 * 1000
/**
 * Días que puede pasar una oportunidad abierta en cada etapa antes de marcarse
 * "sin movimiento". Se reconoce la etapa por su nombre en GHL; la primera que
 * coincide manda. "No asistió" avisa desde el primer día: hay que reactivarle.
 */
export const PLAZOS_POR_ETAPA: { patron: RegExp; dias: number; etiqueta: string }[] = [
  { patron: /nuevo|prospecto/i, dias: 2, etiqueta: 'Nuevo lead: 2 días' },
  { patron: /sin respuesta|contact/i, dias: 3, etiqueta: 'Contactando: 3 días' },
  // Antes que /cita/: "No asistió a la cita" también la contiene.
  { patron: /no asisti/i, dias: 0, etiqueta: 'No asistió: al momento' },
  { patron: /cita/i, dias: 7, etiqueta: 'Cita agendada: 7 días' },
  { patron: /negociaci|seguimiento|propuesta/i, dias: 7, etiqueta: 'Negociación: 7 días' },
]
/** Plazo de las etapas que no coinciden con ninguna de arriba. */
export const DIAS_SIN_MOVIMIENTO = 14

export function plazoEtapa(nombre: string) {
  return PLAZOS_POR_ETAPA.find((p) => p.patron.test(nombre))?.dias ?? DIAS_SIN_MOVIMIENTO
}

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
      const etapa = etapas.find((s) => s.id === o.pipelineStageId)?.name ?? '—'
      const dias = Math.floor((ahora - Date.parse(desde)) / DIA)
      const plazo = plazoEtapa(etapa)
      return {
        id: o.id,
        nombre: o.name || getContactoNombre(o.contact),
        etapa,
        valor: o.monetaryValue ?? 0,
        dias,
        plazo,
        // Lo que más urge: cuánto se ha pasado del plazo, en proporción.
        retraso: (dias - plazo) / Math.max(plazo, 1),
      }
    })
    .filter((o) => o.dias >= o.plazo)
    .sort((a, b) => b.retraso - a.retraso)

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
