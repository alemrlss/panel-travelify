import 'server-only'
import { searchOpportunitiesAll } from '@/lib/ghl/client'

/** won / (won + lost) de las oportunidades del pipeline tocadas en los últimos 90 días. */
export async function getTasaCierre() {
  const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const opps = await searchOpportunitiesAll({})
  const recientes = opps.filter((o) => (o.updatedAt ?? o.createdAt) >= desde)

  const won = recientes.filter((o) => o.status === 'won').length
  const lost = recientes.filter((o) => o.status === 'lost' || o.status === 'abandoned').length
  const abiertos = opps.filter((o) => o.status === 'open')

  return {
    won,
    lost,
    abiertos: abiertos.length,
    valorAbierto: abiertos.reduce((t, o) => t + (o.monetaryValue ?? 0), 0),
    tasa: won + lost > 0 ? won / (won + lost) : null,
  }
}
