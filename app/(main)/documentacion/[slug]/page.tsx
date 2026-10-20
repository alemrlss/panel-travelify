import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIAS_DOC, extraerEncabezados } from '@/lib/documentacion'
import { formatFechaHora } from '@/lib/formato'
import { eliminarDocumento, setFijado } from '@/actions/documentacion'
import { PageContainer } from '@/components/ui/page-container'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BotonAccion } from '@/components/boton-accion'
import { Markdown } from '@/components/documentacion/markdown'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { clsx } from '@/lib/clsx'

export default async function DocumentoPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser()
  const { slug } = await params
  const supabase = await createClient()
  const { data: doc } = await supabase
    .from('documentos')
    .select('id, slug, titulo, categoria, contenido, fijado, updated_at')
    .eq('slug', slug)
    .maybeSingle()
  if (!doc) notFound()

  const indice = extraerEncabezados(doc.contenido)
  const Icon = CATEGORIAS_DOC[doc.categoria].icon

  return (
    <PageContainer>
      <Link
        href="/documentacion"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Documentación
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">
              <Icon size={12} />
              {CATEGORIAS_DOC[doc.categoria].label}
            </Badge>
            {doc.fijado && (
              <Badge tone="neutral">
                <Pin size={12} />
                Fijado
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{doc.titulo}</h1>
          <p className="mt-1 text-xs text-ink/40">Actualizado {formatFechaHora(doc.updated_at)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/documentacion/${doc.slug}/editar`}
            className={clsx(buttonBase, buttonVariants.secondary, buttonSizes.md)}
          >
            <Pencil size={15} />
            Editar
          </Link>
          <BotonAccion
            action={setFijado.bind(null, doc.id, !doc.fijado)}
            size="icon"
            title={doc.fijado ? 'Quitar de fijados' : 'Fijar arriba'}
          >
            {doc.fijado ? <PinOff size={16} /> : <Pin size={16} />}
          </BotonAccion>
          <BotonAccion
            action={eliminarDocumento.bind(null, doc.id)}
            confirmar={`¿Eliminar "${doc.titulo}"? No se puede deshacer.`}
            size="icon"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </BotonAccion>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
        <Card className="min-w-0 sm:p-8">
          {doc.contenido.trim() ? (
            <Markdown contenido={doc.contenido} />
          ) : (
            <p className="text-sm text-ink/40">Este documento está vacío.</p>
          )}
        </Card>

        {indice.length > 1 && (
          <nav className="hidden lg:block" aria-label="Índice">
            <div className="sticky top-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">En esta página</p>
              <ul className="space-y-1.5 border-l border-hairline/10 text-sm">
                {indice.map((h, i) => (
                  <li key={`${h.id}-${i}`}>
                    <a
                      href={`#${h.id}`}
                      className={clsx(
                        '-ml-px block border-l border-transparent text-ink/55 transition-colors hover:border-brand-400 hover:text-ink',
                        h.nivel === 2 ? 'pl-3' : 'pl-6 text-xs'
                      )}
                    >
                      {h.texto}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>
    </PageContainer>
  )
}
