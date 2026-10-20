import { formatEUR, nombreMes } from '@/lib/formato'

// Una sola serie (cobrado por mes): un color, sin leyenda — el título de la
// tarjeta nombra la serie. Barras con extremo redondeado de 4px apoyadas en la
// base, tooltip nativo por barra y etiqueta directa solo en el mes actual.
// #8B5CF6 validado contra #111111 con el validador del skill dataviz.
export function BarrasMensuales({ meses }: { meses: { inicio: string; cents: number }[] }) {
  const max = Math.max(...meses.map((m) => m.cents), 1)
  const actual = meses.length - 1

  return (
    <figure>
      <div className="flex h-44 items-end gap-2 border-b border-hairline/10 sm:gap-3" aria-hidden>
        {meses.map((m, i) => {
          const alto = m.cents === 0 ? 0 : Math.max((m.cents / max) * 100, 3)
          return (
            <div
              key={m.inicio}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {i === actual && m.cents > 0 && (
                <span className="tabular mb-1.5 text-[11px] font-semibold text-ink/80">
                  {formatEUR(m.cents)}
                </span>
              )}
              {/* Tooltip: `hidden` (no opacity-0) para que no ocupe ancho y desborde la
                  página en móvil; anclado al borde en la primera y última barra. */}
              <span
                className={
                  'tabular pointer-events-none absolute -top-2 z-10 hidden -translate-y-full whitespace-nowrap rounded-md border border-hairline/10 bg-elevated px-2 py-1 text-[11px] font-semibold text-ink shadow-soft group-hover:block ' +
                  (i === 0 ? 'left-0' : i === actual ? 'right-0' : 'left-1/2 -translate-x-1/2')
                }
              >
                {nombreMes(m.inicio, true)}: {formatEUR(m.cents)}
              </span>
              <div
                className="w-full max-w-[44px] rounded-t-[4px] bg-[#8B5CF6] transition-[filter] group-hover:brightness-125"
                style={{ height: `${alto}%`, opacity: i === actual ? 1 : 0.55 }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3" aria-hidden>
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

      {/* Vista tabla para lectores de pantalla */}
      <table className="sr-only">
        <caption>Cobrado por mes, últimos 6 meses</caption>
        <tbody>
          {meses.map((m) => (
            <tr key={m.inicio}>
              <th scope="row">{nombreMes(m.inicio, true)}</th>
              <td>{formatEUR(m.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
