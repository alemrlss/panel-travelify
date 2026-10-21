import Link from 'next/link'
import { ChevronRight, FolderKanban, Users } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatFecha } from '@/lib/formato'
import { ESTADOS_CLIENTE } from '@/lib/catalogos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { NuevoCliente } from '@/components/clientes/nuevo-cliente'
import { clsx } from '@/lib/clsx'
import type { EstadoCliente } from '@/lib/supabase/types'

const FILTROS: { value: EstadoCliente | 'todos'; label: string }[] = [
  { value: 'activo', label: 'Activos' },
  { value: 'pausado', label: 'Pausados' },
  { value: 'finalizado', label: 'De baja' },
  { value: 'todos', label: 'Todos' },
]

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  await requireUser()
  const { estado = 'activo' } = await searchParams
  const filtro = FILTROS.some((f) => f.value === estado) ? estado : 'activo'

  const supabase = await createClient()
  const [{ data: clientes }, { data: proyectos }] = await Promise.all([
    supabase.from('clientes').select('*').order('empresa'),
    supabase.from('proyectos').select('cliente_id, estado'),
  ])

  const visibles = (clientes ?? []).filter((c) => filtro === 'todos' || c.estado === filtro)
  const conteo = (e: string) =>
    e === 'todos' ? (clientes?.length ?? 0) : (clientes?.filter((c) => c.estado === e).length ?? 0)

  return (
    <PageContainer>
      <PageHeader eyebrow="Cartera" title="Clientes" action={<NuevoCliente />} />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <Link
            key={f.value}
            href={`/clientes?estado=${f.value}`}
            className={clsx(
              'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
              filtro === f.value
                ? 'border-brand-500 bg-brand-600 text-white'
                : 'border-hairline/10 bg-card text-ink/55 hover:text-ink'
            )}
          >
            {f.label}
            <span
              className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                filtro === f.value ? 'bg-white/20' : 'bg-hairline/10'
              )}
            >
              {conteo(f.value)}
            </span>
          </Link>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Card>
          <EstadoVacio
            icon={<Users size={20} />}
            titulo={clientes?.length ? 'No hay clientes con este estado' : 'Todavía no tienes clientes'}
            texto={
              clientes?.length
                ? undefined
                : 'Lo normal es convertir un lead ganado desde el Pipeline. También puedes crearlo a mano.'
            }
            action={clientes?.length ? undefined : <NuevoCliente />}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visibles.map((c) => {
            const suyos = (proyectos ?? []).filter((p) => p.cliente_id === c.id)
            const enCurso = suyos.filter((p) => p.estado === 'en_curso' || p.estado === 'en_revision').length
            const entregados = suyos.filter((p) => p.estado === 'entregado').length

            return (
              <Link key={c.id} href={`/clientes/${c.id}`} className="group">
                <Card className="h-full p-4 transition-all group-hover:border-brand-500/40 group-hover:shadow-lift sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink">{c.empresa}</p>
                      <p className="mt-0.5 truncate text-xs text-ink/50">
                        {c.responsable ?? '—'} · desde {formatFecha(c.fecha_inicio)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={ESTADOS_CLIENTE[c.estado].tone}>{ESTADOS_CLIENTE[c.estado].label}</Badge>
                      <ChevronRight size={18} className="text-ink/25 transition-colors group-hover:text-brand-300" />
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2">
                    <Cifra label="Servicios" valor={suyos.length} />
                    <Cifra label="En curso" valor={enCurso} />
                    <Cifra label="Entregados" valor={entregados} />
                  </dl>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}

function Cifra({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-xl bg-elevated px-3 py-2">
      <dt className="flex items-center gap-1 text-[11px] text-ink/40">
        {label === 'Servicios' && <FolderKanban size={11} />}
        {label}
      </dt>
      <dd className="tabular mt-0.5 text-sm font-bold text-ink">{valor}</dd>
    </div>
  )
}
