import Link from 'next/link'
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Repeat, Wallet } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { esRecurrenteVigente, esVencido } from '@/lib/metricas'
import { formatEUR, formatFecha, hoyISO, inicioDeMes, nombreMes } from '@/lib/formato'
import { registrarPago } from '@/actions/facturacion'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { FormDialogo } from '@/components/form-dialogo'
import { CamposPago } from '@/components/campos'
import { ListaPagos } from '@/components/facturacion/lista-pagos'
import { GenerarCobros } from '@/components/facturacion/generar-cobros'
import { clsx } from '@/lib/clsx'

const VISTAS = [
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'pagados', label: 'Pagados' },
  { value: 'recurrentes', label: 'Mensuales' },
] as const
type Vista = (typeof VISTAS)[number]['value']

/** Próxima fecha de cobro (YYYY-MM-DD) de un servicio mensual, desde hoy. */
function proximoCobro(dia: number, hoy: string) {
  const esteMes = `${hoy.slice(0, 8)}${String(dia).padStart(2, '0')}`
  return esteMes >= hoy ? esteMes : `${inicioDeMes(1, hoy).slice(0, 8)}${String(dia).padStart(2, '0')}`
}

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>
}) {
  await requireUser()
  const { vista: vistaParam } = await searchParams
  const vista: Vista = VISTAS.some((v) => v.value === vistaParam) ? (vistaParam as Vista) : 'pendientes'

  const supabase = await createClient()
  const [{ data: pagos }, { data: servicios }, { data: clientes }] = await Promise.all([
    supabase.from('pagos').select('*').order('fecha_vencimiento', { ascending: true }),
    supabase.from('servicios_contratados').select('*').eq('tipo_cobro', 'recurrente_mensual').order('dia_cobro'),
    supabase.from('clientes').select('id, nombre_cache, estado').order('nombre_cache'),
  ])

  const hoy = hoyISO()
  const nombres = new Map(clientes?.map((c) => [c.id, c.nombre_cache]))
  const pendientes = (pagos ?? []).filter((p) => p.estado === 'pendiente')
  const vencidos = pendientes.filter((p) => esVencido(p, hoy))
  const pagados = (pagos ?? [])
    .filter((p) => p.estado !== 'pendiente')
    .sort((a, b) => (b.fecha_pago ?? b.fecha_vencimiento).localeCompare(a.fecha_pago ?? a.fecha_vencimiento))
  const mesActual = inicioDeMes(0, hoy)
  const cobradoMes = pagados
    .filter((p) => p.estado === 'pagado' && p.fecha_pago! >= mesActual)
    .reduce((t, p) => t + p.importe_cents, 0)
  const vigentes = (servicios ?? []).filter((s) => esRecurrenteVigente(s, hoy))
  const mrr = vigentes.reduce((t, s) => t + s.importe_cents, 0)

  const meses = [0, 1, -1].map((o) => {
    const value = inicioDeMes(o, hoy)
    return { value, label: nombreMes(value, true) }
  })

  const conteos: Record<Vista, number> = {
    pendientes: pendientes.length,
    pagados: pagados.length,
    recurrentes: vigentes.length,
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cobros"
        title="Facturación"
        action={
          <FormDialogo
            titulo="Registrar cobro"
            trigger={<><Plus size={16} />Registrar cobro</>}
            triggerVariant="secondary"
            action={registrarPago}
            submitLabel="Registrar"
          >
            <CamposPago clientes={clientes ?? []} />
          </FormDialogo>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<CalendarClock size={15} />}
          label="Pendiente"
          valor={formatEUR(pendientes.reduce((t, p) => t + p.importe_cents, 0))}
          detalle={`${pendientes.length} cobro${pendientes.length === 1 ? '' : 's'}`}
        />
        <KpiCard
          icon={<AlertTriangle size={15} />}
          label="Vencido"
          valor={formatEUR(vencidos.reduce((t, p) => t + p.importe_cents, 0))}
          alerta={vencidos.length > 0}
          detalle={vencidos.length ? `${vencidos.length} sin cobrar a tiempo` : 'Todo al día'}
        />
        <KpiCard
          icon={<CheckCircle2 size={15} />}
          label="Cobrado este mes"
          valor={formatEUR(cobradoMes)}
        />
        <KpiCard icon={<Repeat size={15} />} label="Recurrente mensual" valor={formatEUR(mrr)} />
      </div>

      <Card className="mt-4">
        <CardTitle icon={<CalendarClock size={17} />}>Cobros mensuales</CardTitle>
        <p className="mb-4 text-sm text-ink/55">
          Crea los cobros pendientes de todos los servicios mensuales activos del mes elegido. Si
          ya estaban generados, no se duplican.
        </p>
        <GenerarCobros meses={meses} />
      </Card>

      <div className="mb-4 mt-6 flex gap-2 overflow-x-auto pb-1">
        {VISTAS.map((v) => (
          <Link
            key={v.value}
            href={`/facturacion?vista=${v.value}`}
            className={clsx(
              'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
              vista === v.value
                ? 'border-brand-500 bg-brand-600 text-white'
                : 'border-hairline/10 bg-card text-ink/55 hover:text-ink'
            )}
          >
            {v.label}
            <span
              className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                vista === v.value ? 'bg-white/20' : 'bg-hairline/10'
              )}
            >
              {conteos[v.value]}
            </span>
          </Link>
        ))}
      </div>

      <Card>
        {vista === 'pendientes' &&
          (pendientes.length ? (
            <ListaPagos pagos={pendientes} clientes={nombres} />
          ) : (
            <EstadoVacio icon={<Wallet size={20} />} titulo="No hay cobros pendientes" />
          ))}

        {vista === 'pagados' &&
          (pagados.length ? (
            <ListaPagos pagos={pagados} clientes={nombres} />
          ) : (
            <EstadoVacio icon={<CheckCircle2 size={20} />} titulo="Aún no hay cobros pagados" />
          ))}

        {vista === 'recurrentes' &&
          (vigentes.length ? (
            <ul className="divide-y divide-hairline/[0.06]">
              {vigentes.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/clientes/${s.cliente_id}`}
                      className="block truncate text-sm font-semibold text-ink hover:text-brand-300"
                    >
                      {nombres.get(s.cliente_id) ?? '—'}
                    </Link>
                    <p className="truncate text-xs text-ink/45">{s.concepto}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="tabular text-sm font-bold text-ink">
                      {formatEUR(s.importe_cents)}
                      <span className="text-xs font-medium text-ink/45">/mes</span>
                    </p>
                    <Badge tone="neutral" className="mt-1">
                      Próximo: {formatFecha(proximoCobro(s.dia_cobro ?? 1, hoy))}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVacio
              icon={<Repeat size={20} />}
              titulo="No hay servicios mensuales activos"
              texto="Se añaden desde la ficha de cada cliente, en “Lo que cobra”."
            />
          ))}
      </Card>
    </PageContainer>
  )
}
