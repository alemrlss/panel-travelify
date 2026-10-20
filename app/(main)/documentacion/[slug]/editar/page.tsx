import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { EditorDocumento } from '@/components/documentacion/editor-documento'

export default async function EditarDocumentoPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser()
  const { slug } = await params
  const supabase = await createClient()
  const { data: doc } = await supabase.from('documentos').select('*').eq('slug', slug).maybeSingle()
  if (!doc) notFound()

  return (
    <PageContainer ancho>
      <Link
        href={`/documentacion/${doc.slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Volver al documento
      </Link>
      <PageHeader eyebrow="Editar" title={doc.titulo} />
      <EditorDocumento documento={doc} />
    </PageContainer>
  )
}
