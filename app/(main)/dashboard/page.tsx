import Link from 'next/link'
import { ArrowRight, BookText, Euro, FolderKanban, KanbanSquare, Plus, Target, UserPlus, Users } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTasaCierre } from '@/lib/metricas'
import { CATEGORIAS_DOC } from '@/lib/documentacion'
import { diasDesde, formatEUR, formatFecha, inicioDeMes, nombreMes } from '@/lib/formato'
import { ESTADOS_PROYECTO, TIPOS_PROYECTO } from '@/lib/catalogos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { clsx } from '@/lib/clsx'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  // GHL va aparte: si falla, el resto del Dashboard carga igual.
  const [cierre, { data: clientes }, { data: proyectos }, { data: docs }] = await Promise.all([
    getTasaCierre().catch(() => null),
    supabase.from('clientes').select('id, nombre_cache, estado'),
    supabase
      .from('proyectos')
      .select('id, cliente_id, nombre, tipo, estado, fecha_entrega')
      .in('estado', ['en_curso', 'en_revision'])
      .order('fecha_entrega', { ascending: true, nullsFirst: false }),
    supabase
      .from('documentos')
      .select('id, slug, titulo, categoria, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  const activos = (clientes ?? []).filter((c) => c.estado === 'activo').length
  const nombres = new Map(clientes?.map((c) => [c.id, c.nombre_cache]))

  return (
    <PageContainer>
      <PageHeader eyebrow={nombreMes(inicioDeMes(0), true)} title={`Hola, ${user.full_name.split(' ')[0]}`} />

      {!clientes?.length && (
        <Card className="mb-6 border-brand-500/30 bg-brand-600/[0.06]">
          <p className="text-sm font-semibold text-ink">Empieza a cargar tu negocio</p>
          <p className="mt-1 text-sm text-ink/55">
            Crea tus clientes desde los contactos de tu CRM, añade sus proyectos y documenta tus
            procesos de Travelify.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/clientes" className={clsx(buttonBase, buttonVariants.primary, buttonSizes.md)}>
              <UserPlus size={16} />
              Crear cliente
            </Link>
            <Link href="/documentacion/nuevo" className={clsx(buttonBase, buttonVariants.secondary, buttonSizes.md)}>
              <Plus size={16} />
              Nuevo documento
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<Users size={15} />}
          label="Clientes activos"
          valor={String(activos)}
          detalle={`${clientes?.length ?? 0} en total`}
        />
        <KpiCard
          icon={<FolderKanban size={15} />}
          label="Proyectos en curso"
          valor={String(proyectos?.length ?? 0)}
          detalle="En curso o en revisión"
        />
        <KpiCard
          icon={<KanbanSquare size={15} />}
          label="Oportunidades abiertas"
          valor={cierre ? String(cierre.abiertos) : '—'}
          detalle="En tu pipeline"
        />
        <KpiCard
          icon={<Euro size={15} />}
          label="Valor en pipeline"
          valor={cierre ? formatEUR(cierre.valorAbierto * 100) : '—'}
          detalle="Suma de oportunidades abiertas"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle icon={<Target size={17} />} action={<VerTodo href="/pipeline" />}>
            Tasa de cierre
          </CardTitle>
          {cierre ? (
            <>
              <p className="tabular text-4xl font-bold tracking-tight text-ink">
                {cierre.tasa === null ? '—' : `${Math.round(cierre.tasa * 100)}%`}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                {cierre.tasa === null
                  ? 'Sin oportunidades cerradas en los últimos 90 días'
                  : 'Ganadas sobre cerradas, últimos 90 días'}
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Mini label="Ganadas" valor={cierre.won} />
                <Mini label="Perdidas" valor={cierre.lost} />
                <Mini label="Abiertas" valor={cierre.abiertos} />
              </dl>
            </>
          ) : (
            <p className="text-sm text-amber-200">No se pudo leer el pipeline en este momento.</p>
          )}
        </Card>

        <Card>
          <CardTitle icon={<FolderKanban size={17} />} action={<VerTodo href="/clientes" />}>
            Proyectos en curso
          </CardTitle>
          {!proyectos?.length ? (
            <EstadoVacio
              icon={<FolderKanban size={20} />}
              titulo="Ningún proyecto en curso"
              texto="Los proyectos en curso o en revisión aparecen aquí."
            />
          ) : (
            <ul className="divide-y divide-hairline/[0.06]">
              {proyectos.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/clientes/${p.cliente_id}`}
                      className="block truncate text-sm font-semibold text-ink hover:text-brand-300"
                    >
                      {p.nombre}
                    </Link>
                    <p className="truncate text-xs text-ink/45">
                      {nombres.get(p.cliente_id)} · {TIPOS_PROYECTO[p.tipo]}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <Badge tone={ESTADOS_PROYECTO[p.estado].tone}>{ESTADOS_PROYECTO[p.estado].label}</Badge>
                    {p.fecha_entrega && (
                      <span className="text-[11px] text-ink/40">Entrega {formatFecha(p.fecha_entrega)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle icon={<BookText size={17} />} action={<VerTodo href="/documentacion" />}>
            Documentación reciente
          </CardTitle>
          {!docs?.length ? (
            <EstadoVacio
              icon={<BookText size={20} />}
              titulo="Aún no hay documentos"
              texto="Documenta tus procesos de Travelify para no depender de la memoria."
            />
          ) : (
            <ul className="divide-y divide-hairline/[0.06]">
              {docs.map((d) => {
                const dias = diasDesde(d.updated_at.slice(0, 10))
                return (
                  <li key={d.id} className="py-3">
                    <Link
                      href={`/documentacion/${d.slug}`}
                      className="block truncate text-sm font-semibold text-ink hover:text-brand-300"
                    >
                      {d.titulo}
                    </Link>
                    <p className="text-xs text-ink/45">
                      {CATEGORIAS_DOC[d.categoria].label} ·{' '}
                      {dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}

function Mini({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-xl bg-elevated px-2 py-2.5">
      <dd className="tabular text-lg font-bold text-ink">{valor}</dd>
      <dt className="text-[11px] text-ink/45">{label}</dt>
    </div>
  )
}

function VerTodo({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-300 hover:text-brand-200"
    >
      Ver todo
      <ArrowRight size={13} />
    </Link>
  )
}
