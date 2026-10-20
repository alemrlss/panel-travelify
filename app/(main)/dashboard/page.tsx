import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  FolderKanban,
  Repeat,
  Target,
  Users,
  Wallet,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getResumenFinanciero, getTasaCierre } from '@/lib/metricas'
import { formatEUR, formatFecha, nombreMes, inicioDeMes } from '@/lib/formato'
import { ESTADOS_PROYECTO, TIPOS_PROYECTO } from '@/lib/catalogos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { BarrasMensuales } from '@/components/dashboard/barras-mensuales'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { clsx } from '@/lib/clsx'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  // GHL va aparte: si falla, el resto del Dashboard carga igual.
  const [resumen, cierre, { data: proyectos }, { data: clientes }] = await Promise.all([
    getResumenFinanciero(),
    getTasaCierre().catch(() => null),
    supabase
      .from('proyectos')
      .select('id, cliente_id, nombre, tipo, estado, fecha_entrega')
      .in('estado', ['en_curso', 'en_revision'])
      .order('fecha_entrega', { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from('clientes').select('id, nombre_cache'),
  ])
  const nombres = new Map(clientes?.map((c) => [c.id, c.nombre_cache]))
  const nombre = user.full_name.split(' ')[0]

  return (
    <PageContainer>
      <PageHeader
        eyebrow={nombreMes(inicioDeMes(0), true)}
        title={`Hola, ${nombre}`}
      />

      {resumen.totalClientes === 0 && (
        <Card className="mb-6 border-brand-500/30 bg-brand-600/[0.06]">
          <p className="text-sm font-semibold text-ink">Aún no tienes clientes cargados</p>
          <p className="mt-1 text-sm text-ink/55">
            Crea tu primer cliente a partir de un contacto y añade lo que te paga cada mes: el
            Dashboard se calcula solo.
          </p>
          <Link
            href="/clientes"
            className={clsx(buttonBase, buttonVariants.primary, buttonSizes.md, 'mt-4')}
          >
            Ir a Clientes
            <ArrowRight size={16} />
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<Repeat size={15} />}
          label="Recurrente mensual"
          valor={formatEUR(resumen.mrr)}
          detalle="Servicios mensuales activos"
        />
        <KpiCard
          icon={<Wallet size={15} />}
          label="Cobrado este mes"
          valor={formatEUR(resumen.cobradoMes)}
          detalle="Pagos marcados como pagados"
        />
        <KpiCard
          icon={resumen.nVencidos ? <AlertTriangle size={15} /> : <CalendarClock size={15} />}
          label="Pendiente de cobro"
          valor={formatEUR(resumen.pendienteCents)}
          alerta={resumen.nVencidos > 0}
          detalle={
            resumen.nVencidos > 0 ? (
              <span className="font-semibold text-red-300">
                {resumen.nVencidos} vencido{resumen.nVencidos === 1 ? '' : 's'} ·{' '}
                {formatEUR(resumen.vencidoCents)}
              </span>
            ) : (
              'Nada vencido'
            )
          }
        />
        <KpiCard
          icon={<Users size={15} />}
          label="Clientes activos"
          valor={String(resumen.clientesActivos)}
          detalle={`${resumen.totalClientes} en total`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<BarChart3 size={17} />}>Cobrado por mes</CardTitle>
          <BarrasMensuales meses={resumen.porMes} />
        </Card>

        <Card>
          <CardTitle icon={<Target size={17} />}>Tasa de cierre</CardTitle>
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
              <p className="mt-4 text-xs text-ink/45">
                <span className="tabular font-semibold text-ink/80">
                  {formatEUR(cierre.valorAbierto * 100)}
                </span>{' '}
                en oportunidades abiertas
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-200">
              No se pudo leer el pipeline en este momento.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            icon={<CalendarClock size={17} />}
            action={<VerTodo href="/facturacion" />}
          >
            Próximos cobros
          </CardTitle>
          {resumen.proximosCobros.length === 0 ? (
            <EstadoVacio icon={<Wallet size={20} />} titulo="No hay cobros pendientes" />
          ) : (
            <ul className="divide-y divide-hairline/[0.06]">
              {resumen.proximosCobros.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/clientes/${p.cliente_id}`}
                      className="block truncate text-sm font-semibold text-ink hover:text-brand-300"
                    >
                      {p.cliente}
                    </Link>
                    <p className="truncate text-xs text-ink/45">{p.concepto}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-ink">
                      {formatEUR(p.importe_cents)}
                    </p>
                    <p className={clsx('text-xs', p.vencido ? 'font-semibold text-red-300' : 'text-ink/45')}>
                      {p.vencido ? 'Venció ' : ''}
                      {formatFecha(p.fecha_vencimiento)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
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
              {proyectos.map((p) => (
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
                    <Badge tone={ESTADOS_PROYECTO[p.estado].tone}>
                      {ESTADOS_PROYECTO[p.estado].label}
                    </Badge>
                    {p.fecha_entrega && (
                      <span className="text-[11px] text-ink/40">
                        Entrega {formatFecha(p.fecha_entrega)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
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
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
    >
      Ver todo
      <ArrowRight size={13} />
    </Link>
  )
}
