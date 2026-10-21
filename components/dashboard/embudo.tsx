import { formatEUR } from '@/lib/formato'

// Una sola serie (oportunidades abiertas por etapa): un color (#8B5CF6, validado
// contra #111111), sin leyenda, etiqueta directa con nº y valor. El color de la
// etapa en GHL va solo como punto junto al nombre, no codifica datos.
export function Embudo({
  etapas,
}: {
  etapas: { id: string; nombre: string; color?: string; n: number; valor: number }[]
}) {
  const max = Math.max(...etapas.map((e) => e.n), 1)

  return (
    <ul className="space-y-3.5">
      {etapas.map((e) => (
        <li key={e.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink/80">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: e.color ?? '#8B5CF6' }} />
              <span className="truncate">{e.nombre}</span>
            </span>
            <span className="tabular flex-shrink-0 text-xs text-ink/50">
              <span className="text-sm font-bold text-ink">{e.n}</span>
              {e.valor > 0 && ` · ${formatEUR(e.valor * 100)}`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-hairline/[0.06]">
            <div
              className="h-full rounded-full bg-[#8B5CF6]"
              style={{ width: e.n === 0 ? '0%' : `${Math.max((e.n / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
