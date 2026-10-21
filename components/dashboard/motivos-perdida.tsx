import { MOTIVOS_PERDIDA } from '@/lib/catalogos'
import type { MotivoPerdida } from '@/lib/supabase/types'

// Una sola serie (oportunidades perdidas por motivo), mismo trazo que el embudo:
// un color, etiqueta directa con el nº y el %, ordenado de más a menos.
export function MotivosPerdida({ motivos }: { motivos: MotivoPerdida[] }) {
  const cuenta = new Map<MotivoPerdida, number>()
  for (const m of motivos) cuenta.set(m, (cuenta.get(m) ?? 0) + 1)
  const filas = [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  const max = Math.max(...filas.map(([, n]) => n), 1)

  return (
    <ul className="space-y-3.5">
      {filas.map(([motivo, n]) => (
        <li key={motivo}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink/80">{MOTIVOS_PERDIDA[motivo]}</span>
            <span className="tabular flex-shrink-0 text-xs text-ink/50">
              <span className="text-sm font-bold text-ink">{n}</span> · {Math.round((n / motivos.length) * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-hairline/[0.06]">
            <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${Math.max((n / max) * 100, 3)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
