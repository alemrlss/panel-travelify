'use client'

import { useActionState } from 'react'
import { CalendarPlus, Check } from 'lucide-react'
import { generarCobrosDelMes } from '@/actions/facturacion'
import { RESULTADO_INICIAL } from '@/lib/acciones'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'

/** Crea los cobros pendientes de los servicios mensuales. Idempotente. */
export function GenerarCobros({ meses }: { meses: { value: string; label: string }[] }) {
  const [estado, formAction, pending] = useActionState(generarCobrosDelMes, RESULTADO_INICIAL)

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <Select name="periodo" defaultValue={meses[0]?.value} className="capitalize sm:w-48">
          {meses.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={pending} className="sm:flex-shrink-0">
          <CalendarPlus size={16} />
          {pending ? 'Generando…' : 'Generar cobros del mes'}
        </Button>
      </form>
      {estado.error && (
        <div className="mt-3">
          <MensajeError>{estado.error}</MensajeError>
        </div>
      )}
      {estado.ok && estado.mensaje && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
          <Check size={15} />
          {estado.mensaje}
        </p>
      )}
    </div>
  )
}
