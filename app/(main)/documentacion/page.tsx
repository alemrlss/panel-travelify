import Link from 'next/link'
import { BookText, Pin, Plus, Search } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIAS_DOC, ORDEN_CATEGORIAS, extracto } from '@/lib/documentacion'
import { diasDesde } from '@/lib/formato'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { clsx } from '@/lib/clsx'
import type { CategoriaDoc, Documento } from '@/lib/supabase/types'

type DocLista = Pick<Documento, 'id' | 'slug' | 'titulo' | 'categoria' | 'contenido' | 'fijado' | 'updated_at'>

function haceCuanto(iso: string) {
  const d = diasDesde(iso.slice(0, 10))
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`
}

export default async function DocumentacionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>
}) {
  await requireUser()
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const categoria = ORDEN_CATEGORIAS.includes(sp.categoria as CategoriaDoc) ? (sp.categoria as CategoriaDoc) : null

  const supabase = await createClient()
  const campos = 'id, slug, titulo, categoria, contenido, fijado, updated_at'
  const { data: todos } = await supabase.from('documentos').select(campos).order('updated_at', { ascending: false })
  let resultados: DocLista[] = todos ?? []
  if (q) {
    const { data } = await supabase
      .from('documentos')
      .select(campos)
      .textSearch('busqueda', q, { type: 'websearch', config: 'spanish' })
    resultados = data ?? []
  }
  if (categoria) resultados = resultados.filter((d) => d.categoria === categoria)

  const conteo = (c: CategoriaDoc) => (todos ?? []).filter((d) => d.categoria === c).length
  const fijados = !q && !categoria ? resultados.filter((d) => d.fijado) : []
  const resto = !q && !categoria ? resultados.filter((d) => !d.fijado) : resultados
  const qs = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams()
    const v = { q: q || null, categoria, ...extra }
    for (const [k, val] of Object.entries(v)) if (val) p.set(k, val)
    const s = p.toString()
    return s ? `?${s}` : '/documentacion'
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Travelify"
        title="Documentación"
        action={
          <Link href="/documentacion/nuevo" className={clsx(buttonBase, buttonVariants.primary, buttonSizes.md)}>
            <Plus size={16} />
            Nuevo documento
          </Link>
        }
      />

      <form className="relative mb-4" action="/documentacion">
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
        <Input name="q" defaultValue={q} placeholder="Buscar en la documentación…" className="pl-10" />
      </form>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Pill href={qs({ categoria: null })} activo={!categoria} label="Todas" n={todos?.length ?? 0} />
        {ORDEN_CATEGORIAS.map((c) => (
          <Pill key={c} href={qs({ categoria: c })} activo={categoria === c} label={CATEGORIAS_DOC[c].label} n={conteo(c)} />
        ))}
      </div>

      {!todos?.length ? (
        <Card>
          <EstadoVacio
            icon={<BookText size={20} />}
            titulo="Aún no hay documentos"
            texto="Empieza documentando cómo das de alta a un cliente nuevo o cómo configuras un agente de WhatsApp."
            action={
              <Link href="/documentacion/nuevo" className={clsx(buttonBase, buttonVariants.primary, buttonSizes.md)}>
                <Plus size={16} />
                Crear el primero
              </Link>
            }
          />
        </Card>
      ) : resultados.length === 0 ? (
        <Card>
          <EstadoVacio
            icon={<Search size={20} />}
            titulo={q ? `Nada coincide con "${q}"` : 'No hay documentos en esta categoría'}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {fijados.length > 0 && <Grupo titulo="Fijados" icono={<Pin size={14} />} docs={fijados} />}
          {q || categoria ? (
            <Grupo titulo={q ? `Resultados para "${q}"` : CATEGORIAS_DOC[categoria!].label} docs={resto} />
          ) : (
            ORDEN_CATEGORIAS.map((c) => {
              const docs = resto.filter((d) => d.categoria === c)
              const Icon = CATEGORIAS_DOC[c].icon
              return docs.length ? (
                <Grupo key={c} titulo={CATEGORIAS_DOC[c].label} icono={<Icon size={14} />} docs={docs} />
              ) : null
            })
          )}
        </div>
      )}
    </PageContainer>
  )
}

function Pill({ href, activo, label, n }: { href: string; activo: boolean; label: string; n: number }) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
        activo ? 'border-brand-500 bg-brand-600 text-white' : 'border-hairline/10 bg-card text-ink/55 hover:text-ink'
      )}
    >
      {label}
      <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] leading-none', activo ? 'bg-white/20' : 'bg-hairline/10')}>
        {n}
      </span>
    </Link>
  )
}

function Grupo({ titulo, icono, docs }: { titulo: string; icono?: React.ReactNode; docs: DocLista[] }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">
        <span className="text-brand-300">{icono}</span>
        {titulo}
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {docs.map((d) => (
          <Link key={d.id} href={`/documentacion/${d.slug}`} className="group">
            <Card className="h-full p-4 transition-all group-hover:border-brand-500/40 group-hover:shadow-lift sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-ink group-hover:text-brand-200">{d.titulo}</p>
                {d.fijado && <Pin size={13} className="mt-0.5 flex-shrink-0 text-brand-300" />}
              </div>
              {d.contenido && <p className="mt-1.5 line-clamp-2 text-xs text-ink/50">{extracto(d.contenido)}</p>}
              <p className="mt-3 text-[11px] text-ink/35">
                {CATEGORIAS_DOC[d.categoria].label} · actualizado {haceCuanto(d.updated_at)}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
