import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Euro,
  Filter,
  KanbanSquare,
  Repeat,
  Target,
  ThumbsDown,
  UserPlus,
  Users,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SIN_MOVIMIENTO, PLAZOS_POR_ETAPA, getResumenPipeline } from '@/lib/metricas'
import { MotivosPerdida } from '@/components/dashboard/motivos-perdida'
import { recurrenteMensual } from '@/lib/servicios'
import { formatEUR, haceDias, inicioDeMes, nombreMes } from '@/lib/formato'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Aviso, Card, CardTitle } from '@/components/ui/card'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Embudo } from '@/components/dashboard/embudo'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { clsx } from '@/lib/clsx'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const mesActual = inicioDeMes(0)

  // GHL va aparte: si falla, las cifras de clientes cargan igual.
  const [p, { data: clientes }, { data: servicios }, { data: perdidas }] = await Promise.all([
    getResumenPipeline().catch(() => null),
    supabase.from('clientes').select('id, estado, created_at'),
    supabase.from('proyectos').select('cliente_id, estado, cobro, importe_cents'),
    supabase.from('oportunidades_perdidas').select('motivo').gte('fecha', haceDias(90)),
  ])
  const idsActivos = new Set((clientes ?? []).filter((c) => c.estado === 'activo').map((c) => c.id))
  const activos = idsActivos.size
  const recurrente = recurrenteMensual((servicios ?? []).filter((s) => idsActivos.has(s.cliente_id)))
  const clientesNuevosMes = (clientes ?? []).filter((c) => c.created_at.slice(0, 10) >= mesActual).length

  return (
    <PageContainer>
      <PageHeader eyebrow={nombreMes(mesActual, true)} title={`Hola, ${user.full_name.split(' ')[0]}`} />

      {!clientes?.length && (
        <Card className="mb-6 border-brand-500/30 bg-brand-600/[0.06]">
          <p className="text-sm font-semibold text-ink">Empieza a cargar tu negocio</p>
          <p className="mt-1 text-sm text-ink/55">
            Convierte en clientes tus oportunidades ganadas o créalos desde los contactos de tu CRM.
          </p>
          <Link href="/clientes" className={clsx(buttonBase, buttonVariants.primary, buttonSizes.md, 'mt-4')}>
            <UserPlus size={16} />
            Crear cliente
          </Link>
        </Card>
      )}

      {!p && <div className="mb-4"><Aviso>No se pudo leer el pipeline en este momento.</Aviso></div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <KpiCard icon={<Users size={15} />} label="Clientes activos" valor={String(activos)} detalle={`${clientes?.length ?? 0} en total`} />
        <KpiCard
          icon={<Repeat size={15} />}
          label="Recurrente mensual"
          valor={formatEUR(recurrente)}
          detalle="Servicios en curso de clientes activos"
        />
        <KpiCard
          icon={<KanbanSquare size={15} />}
          label="Oportunidades abiertas"
          valor={p ? String(p.abiertas) : '—'}
          detalle={p?.pipelineNombre}
        />
        <KpiCard
          icon={<Euro size={15} />}
          label="Valor en pipeline"
          valor={p ? formatEUR(p.valorAbierto * 100) : '—'}
          detalle="Oportunidades abiertas"
        />
        <KpiCard
          icon={<Target size={15} />}
          label="Tasa de cierre"
          valor={p?.tasa === null || !p ? '—' : `${Math.round(p.tasa * 100)}%`}
          detalle={p ? `${p.won90} ganadas · ${p.lost90} perdidas · 90 días` : undefined}
        />
      </div>

      {p && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardTitle icon={<Filter size={17} />} action={<VerTodo href="/pipeline" />}>
              Embudo del pipeline
            </CardTitle>
            {p.abiertas === 0 ? (
              <EstadoVacio
                icon={<KanbanSquare size={20} />}
                titulo="No hay oportunidades abiertas"
                texto="Cuando entren leads en tu pipeline verás aquí cuántos hay en cada etapa."
              />
            ) : (
              <Embudo etapas={p.porEtapa} />
            )}
          </Card>

          <Card>
            <CardTitle icon={<CalendarDays size={17} />}>Este mes</CardTitle>
            <dl className="grid grid-cols-2 gap-2">
              <Mini label="Oportunidades nuevas" valor={p.mes.nuevas} />
              <Mini label="Ganadas" valor={p.mes.ganadas} tono="success" />
              <Mini label="Perdidas" valor={p.mes.perdidas} tono={p.mes.perdidas ? 'danger' : undefined} />
              <Mini label="Clientes nuevos" valor={clientesNuevosMes} />
            </dl>
            {p.mes.valorGanado > 0 && (
              <p className="tabular mt-4 text-xs text-ink/50">
                <span className="font-semibold text-emerald-300">{formatEUR(p.mes.valorGanado * 100)}</span> en
                oportunidades ganadas
              </p>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <CardTitle icon={<Clock size={17} />} action={<VerTodo href="/pipeline" />}>
              Sin movimiento
            </CardTitle>
            <p className="-mt-2 mb-4 text-xs text-ink/40">
              Oportunidades que pasaron el plazo de su etapa ·{' '}
              {PLAZOS_POR_ETAPA.map((x) => x.etiqueta).join(' · ')} · resto: {DIAS_SIN_MOVIMIENTO} días
            </p>
            {p.sinMovimiento.length === 0 ? (
              <EstadoVacio icon={<Clock size={20} />} titulo="Todo en movimiento" />
            ) : (
              <ul className="divide-y divide-hairline/[0.06]">
                {p.sinMovimiento.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/pipeline?lead=${o.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-brand-300"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{o.nombre}</p>
                        <p className="truncate text-xs text-ink/45">
                          {o.etapa}
                          {o.valor > 0 && ` · ${formatEUR(o.valor * 100)}`}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          'tabular flex-shrink-0 text-right text-xs font-semibold',
                          o.plazo === 0 || o.dias >= o.plazo * 2 ? 'text-red-300' : 'text-amber-300'
                        )}
                      >
                        {o.plazo === 0 ? 'Reactivar' : `${o.dias} ${o.dias === 1 ? 'día' : 'días'}`}
                        <span className="block text-[11px] font-normal text-ink/40">
                          {o.plazo === 0 ? `hace ${o.dias} ${o.dias === 1 ? 'día' : 'días'}` : `plazo ${o.plazo}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle icon={<ThumbsDown size={17} />}>Por qué se pierden</CardTitle>
            <p className="-mt-2 mb-4 text-xs text-ink/40">Motivo de las oportunidades perdidas · 90 días</p>
            {!perdidas?.length ? (
              <EstadoVacio
                icon={<ThumbsDown size={20} />}
                titulo="Sin pérdidas registradas"
                texto="Al marcar una oportunidad como perdida, apunta el motivo y aquí verás en qué se te escapan las ventas."
              />
            ) : (
              <MotivosPerdida motivos={perdidas.map((x) => x.motivo)} />
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  )
}

function Mini({ label, valor, tono }: { label: string; valor: number; tono?: 'success' | 'danger' }) {
  return (
    <div className="rounded-xl bg-elevated px-3 py-3">
      <dd
        className={clsx(
          'tabular text-xl font-bold',
          tono === 'success' && valor > 0 ? 'text-emerald-300' : tono === 'danger' ? 'text-red-300' : 'text-ink'
        )}
      >
        {valor}
      </dd>
      <dt className="mt-0.5 text-[11px] leading-tight text-ink/45">{label}</dt>
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
