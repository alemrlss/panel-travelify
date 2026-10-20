import { Info } from 'lucide-react'
import { formatEUR } from '@/lib/formato'
import { clsx } from '@/lib/clsx'
import type { Resumen } from '@/lib/contabilidad'

const FILAS: { key: keyof Resumen; label: string; signo?: boolean; fuerte?: boolean }[] = [
  { key: 'ingresos', label: 'Ingresos (base)' },
  { key: 'gastos', label: 'Gastos (base)' },
  { key: 'beneficio', label: 'Beneficio', signo: true, fuerte: true },
  { key: 'ivaRepercutido', label: 'IVA repercutido' },
  { key: 'ivaSoportado', label: 'IVA soportado' },
  { key: 'ivaResultado', label: 'Resultado IVA', signo: true, fuerte: true },
  { key: 'irpfVentas', label: 'IRPF que te retuvieron' },
  { key: 'irpfCompras', label: 'IRPF retenido en compras' },
]

function Valor({ cents, signo, fuerte }: { cents: number; signo?: boolean; fuerte?: boolean }) {
  return (
    <span
      className={clsx(
        'tabular',
        fuerte ? 'font-bold' : 'font-medium',
        signo && cents < 0 ? 'text-red-300' : fuerte ? 'text-ink' : 'text-ink/80'
      )}
    >
      {formatEUR(cents)}
    </span>
  )
}

export function ResumenTrimestral({
  trimestres,
  total,
}: {
  trimestres: (Resumen & { t: number })[]
  total: Resumen
}) {
  const columnas = [...trimestres.map((t) => ({ label: `${t.t}T`, r: t as Resumen })), { label: 'Año', r: total }]

  return (
    <div>
      {/* Desktop: tabla, una columna por trimestre */}
      <div className="hidden overflow-hidden rounded-xl border border-hairline/[0.07] md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-elevated text-xs text-ink/50">
              <th className="px-4 py-2.5 text-left font-semibold">Concepto</th>
              {columnas.map((c) => (
                <th key={c.label} className={clsx('px-4 py-2.5 text-right font-semibold', c.label === 'Año' && 'text-brand-300')}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/[0.05]">
            {FILAS.map((f) => (
              <tr key={f.key} className={f.fuerte ? 'bg-hairline/[0.02]' : undefined}>
                <td className={clsx('px-4 py-2.5', f.fuerte ? 'font-semibold text-ink' : 'text-ink/65')}>{f.label}</td>
                {columnas.map((c) => (
                  <td key={c.label} className="px-4 py-2.5 text-right">
                    <Valor cents={c.r[f.key]} signo={f.signo} fuerte={f.fuerte} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: una tarjeta por trimestre, sin scroll horizontal */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {columnas.map((c) => (
          <div key={c.label} className="rounded-xl border border-hairline/[0.07] bg-elevated p-4">
            <p className={clsx('mb-2 text-sm font-bold', c.label === 'Año' ? 'text-brand-300' : 'text-ink')}>
              {c.label === 'Año' ? 'Total del año' : `${c.label.replace('T', '')}.º trimestre`}
            </p>
            <dl className="space-y-1.5 text-sm">
              {FILAS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <dt className={f.fuerte ? 'font-semibold text-ink' : 'text-ink/60'}>{f.label}</dt>
                  <dd>
                    <Valor cents={c.r[f.key]} signo={f.signo} fuerte={f.fuerte} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-ink/45">
        <Info size={14} className="mt-px flex-shrink-0 text-brand-300/70" />
        Orientativo para los modelos 303 (IVA: resultado positivo = a ingresar) y 130 (IRPF).
        Calculado por fecha de factura. Confírmalo con tu gestoría.
      </p>
    </div>
  )
}
