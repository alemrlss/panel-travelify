import Link from 'next/link'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Download,
  FileMinus,
  FilePlus,
  PiggyBank,
  Plus,
  Scale,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import {
  diasDesde,
  getFacturas,
  getOpcionesFactura,
  periodoDesdeParam,
  resumen,
  resumenTrimestral,
  trimestreActual,
} from '@/lib/contabilidad'
import { capitalizar, formatEUR, hoyISO, inicioDeMes, nombreMes } from '@/lib/formato'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { ListaFacturas } from '@/components/contabilidad/lista-facturas'
import { NuevaFactura } from '@/components/contabilidad/nueva-factura'
import { ResumenTrimestral } from '@/components/contabilidad/resumen-trimestral'
import { SelectorParam } from '@/components/contabilidad/selector-periodo'
import { ExportarMes } from '@/components/contabilidad/exportar-mes'
import { clsx } from '@/lib/clsx'

const VISTAS = [
  { value: 'ventas', label: 'Ventas' },
  { value: 'compras', label: 'Compras' },
  { value: 'resumen', label: 'Resumen' },
] as const
type Vista = (typeof VISTAS)[number]['value']

function opcionesPeriodo(tipo: 'mes' | 'trimestre' | 'año', hoy: string) {
  const año = Number(hoy.slice(0, 4))
  if (tipo === 'mes') {
    return Array.from({ length: 12 }, (_, i) => {
      const inicio = inicioDeMes(-i, hoy)
      return { value: inicio.slice(0, 7), label: capitalizar(nombreMes(inicio, true)) }
    })
  }
  if (tipo === 'trimestre') {
    const [y, t] = trimestreActual(hoy).split('-T').map(Number)
    return Array.from({ length: 8 }, (_, i) => {
      const n = (y * 4 + t - 1) - i
      const yy = Math.floor(n / 4)
      const tt = (n % 4) + 1
      return { value: `${yy}-T${tt}`, label: `${tt}.º trimestre ${yy}` }
    })
  }
  return Array.from({ length: 4 }, (_, i) => ({ value: String(año - i), label: String(año - i) }))
}

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; periodo?: string; año?: string }>
}) {
  await requireUser()
  const sp = await searchParams
  const vista: Vista = VISTAS.some((v) => v.value === sp.vista) ? (sp.vista as Vista) : 'ventas'
  const hoy = hoyISO()
  const periodo = periodoDesdeParam(sp.periodo)

  const [facturas, opciones, pendientesCobro] = await Promise.all([
    getFacturas({ desde: periodo.desde, hasta: periodo.hasta }),
    getOpcionesFactura(),
    getFacturas({ tipo: 'venta', estado: 'pendiente' }),
  ])
  const r = resumen(facturas)
  const antiguas = pendientesCobro.filter((f) => diasDesde(f.fecha, hoy) > 30)
  const pendienteTotal = pendientesCobro.reduce((t, f) => t + f.total_cents, 0)

  const añoResumen = /^\d{4}$/.test(sp.año ?? '') ? Number(sp.año) : Number(hoy.slice(0, 4))
  const trimestral = vista === 'resumen' ? await resumenTrimestral(añoResumen) : null

  const ventas = facturas.filter((f) => f.tipo === 'venta')
  const compras = facturas.filter((f) => f.tipo === 'compra')
  const conteos: Record<Vista, number | null> = { ventas: ventas.length, compras: compras.length, resumen: null }

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ vista, ...(sp.periodo ? { periodo: sp.periodo } : {}), ...extra })
    return `?${p.toString()}`
  }
  const valorPorDefecto = {
    mes: hoy.slice(0, 7),
    trimestre: trimestreActual(hoy),
    año: hoy.slice(0, 4),
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Orden interno"
        title="Contabilidad"
        action={
          <div className="flex gap-2">
            <NuevaFactura
              tipo="venta"
              opciones={opciones}
              trigger={<><FilePlus size={16} />Nueva venta</>}
              triggerVariant="primary"
            />
            <NuevaFactura tipo="compra" opciones={opciones} trigger={<><FileMinus size={16} />Nueva compra</>} />
          </div>
        }
      />

      {vista !== 'resumen' && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-full border border-hairline/10 bg-card p-1">
            {(['mes', 'trimestre', 'año'] as const).map((t) => (
              <Link
                key={t}
                href={qs({ periodo: valorPorDefecto[t] })}
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors',
                  periodo.tipo === t ? 'bg-brand-600 text-white' : 'text-ink/55 hover:text-ink'
                )}
              >
                {t}
              </Link>
            ))}
          </div>
          <SelectorParam
            param="periodo"
            valor={periodo.valor}
            opciones={opcionesPeriodo(periodo.tipo, hoy)}
            className="sm:w-60"
          />
        </div>
      )}

      {vista !== 'resumen' && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard icon={<ArrowUpCircle size={15} />} label="Ingresos" valor={formatEUR(r.ingresos)} detalle={`${r.nVentas} venta${r.nVentas === 1 ? '' : 's'} · sin IVA`} />
          <KpiCard icon={<ArrowDownCircle size={15} />} label="Gastos" valor={formatEUR(r.gastos)} detalle={`${r.nCompras} compra${r.nCompras === 1 ? '' : 's'} · sin IVA`} />
          <KpiCard
            icon={<PiggyBank size={15} />}
            label="Beneficio"
            valor={formatEUR(r.beneficio)}
            alerta={r.beneficio < 0}
            detalle={periodo.etiqueta}
          />
          <KpiCard
            icon={<CalendarClock size={15} />}
            label="Pendiente de cobro"
            valor={formatEUR(pendienteTotal)}
            alerta={antiguas.length > 0}
            detalle={
              antiguas.length > 0 ? (
                <span className="font-semibold text-red-300">
                  {antiguas.length} con más de 30 días
                </span>
              ) : (
                `${pendientesCobro.length} factura${pendientesCobro.length === 1 ? '' : 's'} · total`
              )
            }
          />
        </div>
      )}

      <div className="mb-4 mt-6 flex gap-2 overflow-x-auto pb-1">
        {VISTAS.map((v) => (
          <Link
            key={v.value}
            href={`?${new URLSearchParams({ vista: v.value, ...(sp.periodo ? { periodo: sp.periodo } : {}) }).toString()}`}
            className={clsx(
              'flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
              vista === v.value
                ? 'border-brand-500 bg-brand-600 text-white'
                : 'border-hairline/10 bg-card text-ink/55 hover:text-ink'
            )}
          >
            {v.label}
            {conteos[v.value] !== null && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                  vista === v.value ? 'bg-white/20' : 'bg-hairline/10'
                )}
              >
                {conteos[v.value]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {vista === 'ventas' && (
        <Card>
          {ventas.length ? (
            <ListaFacturas facturas={ventas} opciones={opciones} />
          ) : (
            <EstadoVacio
              icon={<FilePlus size={20} />}
              titulo={`Sin ventas en ${periodo.etiqueta}`}
              texto="Registra las facturas que emites para llevar tu orden interno."
              action={<NuevaFactura tipo="venta" opciones={opciones} trigger={<><Plus size={15} />Nueva venta</>} triggerVariant="primary" />}
            />
          )}
        </Card>
      )}

      {vista === 'compras' && (
        <Card>
          {compras.length ? (
            <ListaFacturas facturas={compras} opciones={opciones} />
          ) : (
            <EstadoVacio
              icon={<FileMinus size={20} />}
              titulo={`Sin compras en ${periodo.etiqueta}`}
              texto="Registra tus gastos: software, publicidad, gestoría…"
              action={<NuevaFactura tipo="compra" opciones={opciones} trigger={<><Plus size={15} />Nueva compra</>} triggerVariant="primary" />}
            />
          )}
        </Card>
      )}

      {vista === 'resumen' && trimestral && (
        <div className="space-y-4">
          <Card>
            <CardTitle
              icon={<Scale size={17} />}
              action={
                <div className="w-28 flex-shrink-0">
                  <SelectorParam param="año" valor={String(añoResumen)} opciones={opcionesPeriodo('año', hoy)} />
                </div>
              }
            >
              Resumen {añoResumen}
            </CardTitle>
            <ResumenTrimestral trimestres={trimestral.trimestres} total={trimestral.total} />
          </Card>

          <Card>
            <CardTitle icon={<Download size={17} />}>Exportar para la gestoría</CardTitle>
            <p className="mb-4 text-sm text-ink/55">
              Un ZIP con las ventas y compras del mes en CSV (se abre en Excel) y todos los archivos
              adjuntos.
            </p>
            <ExportarMes meses={opcionesPeriodo('mes', hoy)} />
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
