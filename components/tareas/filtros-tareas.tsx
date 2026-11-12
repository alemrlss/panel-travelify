'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Select } from '@/components/ui/input'
import { PRIORIDADES, urlTareas, type FiltrosActivos } from '@/lib/tareas'
import type { PrioridadTarea } from '@/lib/supabase/types'
import type { OpcionCliente } from '@/components/tareas/tipos'

/** Filtros del tablero en la URL: ?cliente=<id|sin>&prioridad=<alta|media|baja>. */
export function FiltrosTareas({ clientes, filtros }: { clientes: OpcionCliente[]; filtros: FiltrosActivos }) {
  const router = useRouter()
  const ir = (f: FiltrosActivos) => router.push(urlTareas(f))

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select
        aria-label="Filtrar por cliente"
        value={filtros.cliente ?? ''}
        onChange={(e) => ir({ ...filtros, cliente: e.target.value || undefined })}
        className="w-auto min-w-[180px] sm:py-2"
      >
        <option value="">Todos los clientes</option>
        <option value="sin">Sin cliente (internas)</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.empresa}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filtrar por prioridad"
        value={filtros.prioridad ?? ''}
        onChange={(e) => ir({ ...filtros, prioridad: e.target.value || undefined })}
        className="w-auto min-w-[150px] sm:py-2"
      >
        <option value="">Todas las prioridades</option>
        {(Object.keys(PRIORIDADES) as PrioridadTarea[]).map((p) => (
          <option key={p} value={p}>
            Prioridad {PRIORIDADES[p].label.toLowerCase()}
          </option>
        ))}
      </Select>
      {(filtros.cliente || filtros.prioridad) && (
        <button
          type="button"
          onClick={() => ir({ hechas: filtros.hechas })}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-ink/55 hover:bg-hairline/5 hover:text-ink"
        >
          <X size={14} />
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
