'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Select } from '@/components/ui/input'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { clsx } from '@/lib/clsx'

/** Descarga el ZIP del mes (ventas.csv, compras.csv y los archivos adjuntos). */
export function ExportarMes({ meses }: { meses: { value: string; label: string }[] }) {
  const [mes, setMes] = useState(meses[0]?.value ?? '')

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={mes} onChange={(e) => setMes(e.target.value)} className="sm:w-56">
        {meses.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>
      <a
        href={`/contabilidad/exportar?mes=${mes}`}
        download
        className={clsx(buttonBase, buttonVariants.primary, buttonSizes.md, 'sm:flex-shrink-0')}
      >
        <Download size={16} />
        Descargar ZIP
      </a>
    </div>
  )
}
