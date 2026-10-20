import Link from 'next/link'
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  BarChart3,
  CalendarClock,
  FilePlus,
  FolderKanban,
  PiggyBank,
  Target,
  UserPlus,
  Users,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTasaCierre } from '@/lib/metricas'
import { diasDesde, getFacturas, resumen, serieMensual } from '@/lib/contabilidad'
import { facturacionPorCliente } from '@/lib/facturacion-clientes'
import { formatEUR, formatFecha, hoyISO, inicioDeMes, nombreMes } from '@/lib/formato'
import { ESTADOS_PROYECTO, TIPOS_PROYECTO } from '@/lib/catalogos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { BarrasIngresosGastos } from '@/components/dashboard/barras-ingresos-gastos'
import { FacturacionPorCliente } from '@/components/dashboard/facturacion-por-cliente'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { clsx } from '@/lib/clsx'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const hoy = hoyISO()
  const mesActual = inicioDeMes(0, hoy)

  // GHL va aparte: si falla, el resto del Dashboard carga igual.
  const [delMes, pendientes, serie, cierre, { data: proyectos }, { data: clientes }] = await Promise.all([
    getFacturas({ desde: mesActual, hasta: inicioDeMes(1, hoy) }),
    getFacturas({ tipo: 'venta', estado: 'pendiente' }),
    serieMensual(6),
    getTasaCierre().catch(() => null),
    supabase
      .from('proyectos')
      .select('id, cliente_id, nombre, tipo, estado, fecha_entrega')
      .in('estado', ['en_curso', 'en_revision'])
      .order('fecha_entrega', { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from('clientes').select('id, nombre_cache, estado, fecha_inicio, cuota_referencia_cents'),
  ])

  const r = resumen(delMes)
  const activos = (clientes ?? []).filter((c) => c.estado === 'activo')
  const porCliente = await facturacionPorCliente(activos)
  const nombres = new Map(clientes?.map((c) => [c.id, c.nombre_cache]))
  const pendienteTotal = pendientes.reduce((t, f) => t + f.total_cents, 0)
  const masAntiguas = pendientes.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5)
  const sinDatos = !clientes?.length && serie.every((m) => !m.ingresos && !m.gastos) && !pendientes.length

  return (
    <PageContainer>
      <PageHeader eyebrow={nombreMes(mesActual, true)} title={`Hola, ${user.full_name.split(' ')[0]}`} />
      <p className="-mt-4 mb-6 text-sm text-ink/45 sm:-mt-6">
        {activos.length} cliente{activos.length === 1 ? '' : 's'} activo{activos.length === 1 ? '' : 's'}
      </p>

      {sinDatos && (
        <Card className="mb-6 border-brand-500/30 bg-brand-600/[0.06]">
          <p className="text-sm font-semibold text-ink">Empieza a cargar tu negocio</p>
          <p className="mt-1 text-sm text-ink/55">
            Crea tus clientes desde los contactos de tu CRM y registra tus facturas de venta y
            compra: el Dashboard se calcula solo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/clientes" className={clsx(buttonBase, buttonVariants.primary, buttonSizes.md)}>
              <UserPlus size={16} />
              Crear cliente
            </Link>
            <Link href="/contabilidad" className={clsx(buttonBase, buttonVariants.secondary, buttonSizes.md)}>
              <FilePlus size={16} />
              Registrar factura
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<ArrowUpCircle size={15} />}
          label="Ingresos del mes"
          valor={formatEUR(r.ingresos)}
          detalle={`${r.nVentas} factura${r.nVentas === 1 ? '' : 's'} · sin IVA`}
        />
        <KpiCard
          icon={<ArrowDownCircle size={15} />}
          label="Gastos del mes"
          valor={formatEUR(r.gastos)}
          detalle={`${r.nCompras} factura${r.nCompras === 1 ? '' : 's'} · sin IVA`}
        />
        <KpiCard
          icon={<PiggyBank size={15} />}
          label="Beneficio del mes"
          valor={formatEUR(r.beneficio)}
          alerta={r.beneficio < 0}
          detalle="Ingresos − gastos"
        />
        <KpiCard
          icon={<CalendarClock size={15} />}
          label="Pendiente de cobro"
          valor={formatEUR(pendienteTotal)}
          alerta={pendientes.some((f) => diasDesde(f.fecha, hoy) > 30)}
          detalle={`${pendientes.length} factura${pendientes.length === 1 ? '' : 's'}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={<BarChart3 size={17} />}>Ingresos y gastos</CardTitle>
          <BarrasIngresosGastos meses={serie} />
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
                <span className="tabular font-semibold text-ink/80">{formatEUR(cierre.valorAbierto * 100)}</span>{' '}
                en oportunidades abiertas
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-200">No se pudo leer el pipeline en este momento.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle icon={<Users size={17} />} action={<VerTodo href="/clientes" />}>
            Facturación por cliente
          </CardTitle>
          <p className="-mt-2 mb-4 text-xs text-ink/40">Últimos 12 meses, clientes activos</p>
          <FacturacionPorCliente
            filas={activos.map((c) => ({ id: c.id, nombre: c.nombre_cache, f: porCliente.get(c.id)! }))}
          />
        </Card>

        <Card>
          <CardTitle icon={<CalendarClock size={17} />} action={<VerTodo href="/contabilidad?vista=ventas" />}>
            Pendientes de cobro
          </CardTitle>
          {masAntiguas.length === 0 ? (
            <EstadoVacio icon={<CalendarClock size={20} />} titulo="Todo cobrado" />
          ) : (
            <ul className="divide-y divide-hairline/[0.06]">
              {masAntiguas.map((f) => {
                const dias = diasDesde(f.fecha, hoy)
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{f.contraparte}</p>
                      <p className="truncate text-xs text-ink/45">
                        {f.numero} · {f.concepto}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="tabular text-sm font-semibold text-ink">{formatEUR(f.total_cents)}</p>
                      <p className={clsx('text-xs', dias > 30 ? 'font-semibold text-red-300' : 'text-ink/45')}>
                        {dias <= 0 ? 'Hoy' : `Hace ${dias} día${dias === 1 ? '' : 's'}`}
                      </p>
                    </div>
                  </li>
                )
              })}
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
