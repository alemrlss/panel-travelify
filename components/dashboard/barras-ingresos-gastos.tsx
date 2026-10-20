import { formatEUR, nombreMes } from '@/lib/formato'

// Dos series (ingresos y gastos, base imponible), barras pareadas por mes.
// Paleta validada con scripts/validate_palette.js del skill dataviz contra #111111
// en modo oscuro: #8B5CF6 (marca) + #0F9F8F — no reutiliza los colores de estado
// (ámbar = pendiente, rojo = alerta). Leyenda siempre visible, tooltip por barra,
// etiqueta directa solo en el mes actual y tabla sr-only.
const SERIES = [
  { key: 'ingresos', label: 'Ingresos', color: '#8B5CF6' },
  { key: 'gastos', label: 'Gastos', color: '#0F9F8F' },
] as const

type Mes = { inicio: string; ingresos: number; gastos: number }

export function BarrasIngresosGastos({ meses }: { meses: Mes[] }) {
  const max = Math.max(...meses.flatMap((m) => [m.ingresos, m.gastos]), 1)
  const actual = meses.length - 1

  return (
    <figure>
      <div className="mb-4 flex items-center gap-4 text-xs text-ink/60">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex h-44 items-end gap-2 border-b border-hairline/10 sm:gap-4" aria-hidden>
        {meses.map((m, i) => (
          <div key={m.inicio} className="flex h-full flex-1 items-end justify-center gap-[2px]">
            {SERIES.map((s, j) => {
              const v = m[s.key]
              const alto = v === 0 ? 0 : Math.max((v / max) * 100, 3)
              // Tooltip con `hidden` (no opacity-0) y anclado al borde en los
              // extremos: si ocupa ancho invisible, desborda la página en móvil.
              const ancla =
                i === 0 && j === 0 ? 'left-0' : i === actual && j === 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
              return (
                <div key={s.key} className="group relative flex h-full w-full max-w-[22px] flex-col justify-end">
                  <span
                    className={`tabular pointer-events-none absolute -top-2 z-10 hidden -translate-y-full whitespace-nowrap rounded-md border border-hairline/10 bg-elevated px-2 py-1 text-[11px] font-semibold text-ink shadow-soft group-hover:block ${ancla}`}
                  >
                    {s.label} {nombreMes(m.inicio)}: {formatEUR(v)}
                  </span>
                  <div
                    className="w-full rounded-t-[4px] transition-[filter] group-hover:brightness-125"
                    style={{ height: `${alto}%`, backgroundColor: s.color, opacity: i === actual ? 1 : 0.6 }}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-4" aria-hidden>
        {meses.map((m, i) => (
          <span
            key={m.inicio}
            className={
              'flex-1 text-center text-[11px] capitalize ' +
              (i === actual ? 'font-semibold text-ink/80' : 'text-ink/40')
            }
          >
            {nombreMes(m.inicio)}
          </span>
        ))}
      </div>
      <p className="tabular mt-3 text-xs text-ink/50">
        {nombreMes(meses[actual].inicio, true)}:{' '}
        <span className="font-semibold text-ink/85">{formatEUR(meses[actual].ingresos)}</span> de
        ingresos ·{' '}
        <span className="font-semibold text-ink/85">{formatEUR(meses[actual].gastos)}</span> de gastos
      </p>

      {/* sr-only en un div: una <table> ignora width:1px y desbordaba la página en móvil */}
      <div className="sr-only">
      <table>
        <caption>Ingresos y gastos por mes (sin IVA), últimos 6 meses</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Ingresos</th>
            <th scope="col">Gastos</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.inicio}>
              <th scope="row">{nombreMes(m.inicio, true)}</th>
              <td>{formatEUR(m.ingresos)}</td>
              <td>{formatEUR(m.gastos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
