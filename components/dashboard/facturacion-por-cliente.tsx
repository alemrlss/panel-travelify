import Link from 'next/link'
import { Users } from 'lucide-react'
import { formatEUR } from '@/lib/formato'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import type { FacturacionCliente } from '@/lib/facturacion-clientes'

// Una sola serie (facturado en 12 meses): un color, sin leyenda.
export function FacturacionPorCliente({
  filas,
}: {
  filas: { id: string; nombre: string; f: FacturacionCliente }[]
}) {
  const conVentas = filas.filter((r) => r.f.ultimos12 > 0).sort((a, b) => b.f.ultimos12 - a.f.ultimos12)
  if (!conVentas.length) {
    return (
      <EstadoVacio
        icon={<Users size={20} />}
        titulo="Aún no hay facturas de venta"
        texto="Cuando registres ventas a tus clientes verás aquí cuánto te factura cada uno."
      />
    )
  }
  const max = conVentas[0].f.ultimos12

  return (
    <ul className="space-y-3">
      {conVentas.slice(0, 8).map((r) => (
        <li key={r.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <Link href={`/clientes/${r.id}`} className="truncate text-sm font-semibold text-ink hover:text-brand-300">
              {r.nombre}
            </Link>
            <span className="tabular flex-shrink-0 text-sm font-bold text-ink">{formatEUR(r.f.ultimos12)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-hairline/[0.06]">
            <div
              className="h-full rounded-full bg-[#8B5CF6]"
              style={{ width: `${Math.max((r.f.ultimos12 / max) * 100, 2)}%` }}
            />
          </div>
          <p className="tabular mt-1 text-[11px] text-ink/40">
            Media {formatEUR(r.f.mediaMensual)}/mes · este mes {formatEUR(r.f.esteMes)}
          </p>
        </li>
      ))}
    </ul>
  )
}
