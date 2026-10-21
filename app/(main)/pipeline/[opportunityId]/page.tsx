import { redirect } from 'next/navigation'

// Ya no hay pantalla de oportunidad: la ficha del lead es el panel lateral del pipeline.
// Los enlaces viejos (/pipeline/ID) abren ese panel.
export default async function OportunidadPage({ params }: { params: Promise<{ opportunityId: string }> }) {
  const { opportunityId } = await params
  redirect(`/pipeline?ver=todas&lead=${encodeURIComponent(opportunityId)}`)
}
