import Link from 'next/link'
import { ChevronRight, FolderKanban, Users } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { facturacionPorCliente } from '@/lib/facturacion-clientes'
import { formatEUR, formatFecha } from '@/lib/formato'
import { ESTADOS_CLIENTE } from '@/lib/catalogos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { NuevoCliente } from '@/components/clientes/nuevo-cliente'
import { Referencia } from '@/components/clientes/referencia'
import { clsx } from '@/lib/clsx'
import type { EstadoCliente } from '@/lib/supabase/types'

const FILTROS: { value: EstadoCliente | 'todos'; label: string }[] = [
  { value: 'activo', label: 'Activos' },
  { value: 'pausado', label: 'Pausados' },
  { value: 'finalizado', label: 'Finalizados' },
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
    supabase.from('clientes').select('*').order('nombre_cache'),
    supabase.from('proyectos').select('cliente_id, estado').neq('estado', 'entregado'),
  ])
  const facturacion = await facturacionPorCliente(clientes ?? [])

  const visibles = (clientes ?? []).filter((c) => filtro === 'todos' || c.estado === filtro)
  const conteo = (e: string) =>
    e === 'todos' ? (clientes?.length ?? 0) : (clientes?.filter((c) => c.estado === e).length ?? 0)

  const activos = (clientes ?? []).filter((c) => c.estado === 'activo')
  const totalMes = activos.reduce((t, c) => t + (facturacion.get(c.id)?.esteMes ?? 0), 0)
  const totalMedia = activos.reduce((t, c) => t + (facturacion.get(c.id)?.mediaMensual ?? 0), 0)

  return (
    <PageContainer>
      <PageHeader eyebrow="Cartera" title="Clientes" action={<NuevoCliente />} />

      {activos.length > 0 && (
        <p className="tabular -mt-2 mb-5 text-sm text-ink/55">
          Tus clientes activos te facturan{' '}
          <span className="font-semibold text-ink">{formatEUR(totalMes)}</span> este mes · media{' '}
          <span className="font-semibold text-ink">{formatEUR(totalMedia)}</span>/mes
        </p>
      )}

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
                : 'Crea uno desde un contacto, o desde una oportunidad ganada en el Pipeline.'
            }
            action={clientes?.length ? undefined : <NuevoCliente />}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visibles.map((c) => {
            const f = facturacion.get(c.id)!
            const nProyectos = (proyectos ?? []).filter((p) => p.cliente_id === c.id).length

            return (
              <Link key={c.id} href={`/clientes/${c.id}`} className="group">
                <Card className="h-full p-4 transition-all group-hover:border-brand-500/40 group-hover:shadow-lift sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink">{c.nombre_cache}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-ink/40">
                        Desde {formatFecha(c.fecha_inicio)}
                        {nProyectos > 0 && (
                          <span className="inline-flex items-center gap-1">
                            · <FolderKanban size={12} /> {nProyectos}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={ESTADOS_CLIENTE[c.estado].tone}>{ESTADOS_CLIENTE[c.estado].label}</Badge>
                      <ChevronRight size={18} className="text-ink/25 transition-colors group-hover:text-brand-300" />
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Cifra label="Este mes" valor={formatEUR(f.esteMes)} nota={<Referencia f={f} />} />
                    <Cifra label="Media/mes" valor={formatEUR(f.mediaMensual)} />
                    <Cifra label="12 meses" valor={formatEUR(f.ultimos12)} />
                    <Cifra label="Pendiente" valor={formatEUR(f.pendiente)} alerta={f.pendiente > 0} />
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

function Cifra({
  label,
  valor,
  nota,
  alerta = false,
}: {
  label: string
  valor: React.ReactNode
  nota?: React.ReactNode
  alerta?: boolean
}) {
  return (
    <div className="rounded-xl bg-elevated px-3 py-2">
      <dt className="text-[11px] text-ink/40">{label}</dt>
      <dd className={clsx('tabular mt-0.5 text-sm font-bold', alerta ? 'text-amber-300' : 'text-ink')}>{valor}</dd>
      {nota && <dd className="mt-0.5 text-[10px] text-ink/45">{nota}</dd>}
    </div>
  )
}
