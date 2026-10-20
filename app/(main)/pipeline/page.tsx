import { requireUser } from '@/lib/auth'
import { getPipelineStages, searchOpportunities } from '@/lib/ghl/client'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Aviso, Card } from '@/components/ui/card'
import { PipelineBoard, type Columna } from '@/components/pipeline/pipeline-board'

export default async function PipelinePage() {
  await requireUser()

  let pipeline
  let columnas: Columna[] = []
  let error: string | null = null

  try {
    pipeline = await getPipelineStages()
    const stages = pipeline?.stages.slice().sort((a, b) => a.position - b.position) ?? []
    columnas = await Promise.all(
      stages.map(async (stage) => ({
        stageId: stage.id,
        stageName: stage.name,
        color: stage.color,
        opportunities: await searchOpportunities({ pipelineStageId: stage.id }),
      }))
    )
  } catch (e) {
    error = e instanceof Error ? e.message : 'No se pudo cargar el pipeline'
  }

  return (
    <PageContainer ancho>
      <PageHeader eyebrow={pipeline?.name ?? 'Ventas'} title="Pipeline" />

      {error && <Aviso>No se pudo cargar el pipeline: {error}</Aviso>}

      {!error && !pipeline && (
        <Card className="text-sm text-ink/60">No hay ningún pipeline configurado.</Card>
      )}

      {pipeline && <PipelineBoard columnasIniciales={columnas} />}
    </PageContainer>
  )
}
