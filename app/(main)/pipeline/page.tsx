import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getPipelineStages, searchOpportunitiesAll } from '@/lib/ghl/client'
import type { GhlOpportunity, GhlPipeline } from '@/lib/ghl/types'
import { createClient } from '@/lib/supabase/server'
import { MOTIVOS_PERDIDA } from '@/lib/catalogos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Aviso, Card } from '@/components/ui/card'
import { PipelineBoard, type Columna } from '@/components/pipeline/pipeline-board'
import { clsx } from '@/lib/clsx'

// Lo perdido no se borra nunca: queda en GHL como status "lost" (en su etapa) y
// con el motivo en Supabase. Por defecto el tablero muestra solo lo abierto.
const VISTAS = {
  abiertas: { label: 'Abiertas', filtro: (o: GhlOpportunity) => o.status === 'open' },
  ganadas: { label: 'Ganadas', filtro: (o: GhlOpportunity) => o.status === 'won' },
  perdidas: { label: 'Perdidas', filtro: (o: GhlOpportunity) => o.status === 'lost' || o.status === 'abandoned' },
  todas: { label: 'Todas', filtro: () => true },
} as const
type Vista = keyof typeof VISTAS

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireUser()
  const { ver } = await searchParams
  const vista: Vista = ver && ver in VISTAS ? (ver as Vista) : 'abiertas'

  let pipeline: GhlPipeline | undefined
  let opps: GhlOpportunity[] = []
  let error: string | null = null

  try {
    ;[pipeline, opps] = await Promise.all([getPipelineStages(), searchOpportunitiesAll({})])
  } catch (e) {
    error = e instanceof Error ? e.message : 'No se pudo cargar el pipeline'
  }

  const supabase = await createClient()
  const { data: perdidas } = await supabase.from('oportunidades_perdidas').select('ghl_opportunity_id, motivo, detalle')
  const motivos = Object.fromEntries(
    (perdidas ?? []).map((p) => [p.ghl_opportunity_id, { motivo: MOTIVOS_PERDIDA[p.motivo], detalle: p.detalle }])
  )

  const visibles = opps.filter(VISTAS[vista].filtro)
  const columnas: Columna[] = (pipeline?.stages.slice().sort((a, b) => a.position - b.position) ?? []).map((s) => ({
    stageId: s.id,
    stageName: s.name,
    color: s.color,
    opportunities: visibles.filter((o) => o.pipelineStageId === s.id),
  }))

  return (
    <PageContainer ancho>
      <PageHeader eyebrow={pipeline?.name ?? 'Ventas'} title="Pipeline" />

      {error && <Aviso>No se pudo cargar el pipeline: {error}</Aviso>}

      {!error && !pipeline && (
        <Card className="text-sm text-ink/60">No hay ningún pipeline configurado.</Card>
      )}

      {pipeline && (
        <>
          <nav aria-label="Filtrar oportunidades" className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {(Object.keys(VISTAS) as Vista[]).map((v) => (
              <Link
                key={v}
                href={v === 'abiertas' ? '/pipeline' : `/pipeline?ver=${v}`}
                aria-current={v === vista ? 'page' : undefined}
                className={clsx(
                  'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
                  v === vista
                    ? 'border-brand-500 bg-brand-600 text-white'
                    : 'border-hairline/10 bg-card text-ink/55 hover:text-ink'
                )}
              >
                {VISTAS[v].label}
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                    v === vista ? 'bg-white/20' : 'bg-hairline/10'
                  )}
                >
                  {opps.filter(VISTAS[v].filtro).length}
                </span>
              </Link>
            ))}
          </nav>
          <PipelineBoard
            key={vista}
            columnasIniciales={columnas}
            motivos={motivos}
            // Solo lo abierto se arrastra entre etapas; lo cerrado se queda donde se cerró.
            arrastrable={vista === 'abiertas'}
            resumen={vista === 'abiertas' ? 'en el pipeline' : `en ${VISTAS[vista].label.toLowerCase()}`}
          />
        </>
      )}
    </PageContainer>
  )
}
