import { formatEUR } from '@/lib/formato'
import type { FacturacionCliente } from '@/lib/facturacion-clientes'

/** "ref. 497 € · −97 €": la cuota de referencia es solo para comparar. */
export function Referencia({ f }: { f: FacturacionCliente }) {
  if (f.referencia === null || f.diferencia === null) return null
  return (
    <span className="tabular">
      ref. {formatEUR(f.referencia)}
      {f.diferencia !== 0 && (
        <span className={f.diferencia < 0 ? 'text-amber-300' : 'text-emerald-300'}>
          {' '}· {f.diferencia > 0 ? '+' : '−'}
          {formatEUR(Math.abs(f.diferencia))}
        </span>
      )}
    </span>
  )
}
