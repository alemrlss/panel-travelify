import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { EditorDocumento } from '@/components/documentacion/editor-documento'

export default async function NuevoDocumentoPage() {
  await requireUser()
  return (
    <PageContainer ancho>
      <Link
        href="/documentacion"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Documentación
      </Link>
      <PageHeader eyebrow="Documentación" title="Nuevo documento" />
      <EditorDocumento />
    </PageContainer>
  )
}
