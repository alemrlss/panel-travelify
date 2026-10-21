'use client'

import { useActionState } from 'react'
import { Check } from 'lucide-react'
import { actualizarCliente } from '@/actions/clientes'
import { RESULTADO_INICIAL } from '@/lib/acciones'
import { Button } from '@/components/ui/button'
import { Campo, Input, Textarea } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'
import { CamposCliente } from '@/components/campos'
import type { Cliente } from '@/lib/supabase/types'

export function FormCliente({ cliente }: { cliente: Cliente }) {
  const [estado, formAction, pending] = useActionState(actualizarCliente, RESULTADO_INICIAL)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={cliente.id} />
      <CamposCliente cliente={cliente} />
      <Campo label="Cliente desde">
        <Input name="fecha_inicio" type="date" required defaultValue={cliente.fecha_inicio} />
      </Campo>
      <Campo label="Notas fijas">
        <Textarea
          name="notas"
          defaultValue={cliente.notas ?? ''}
          placeholder="Datos que no cambian: horarios, cómo le gusta que le contacten…"
        />
      </Campo>
      {estado.error && <MensajeError>{estado.error}</MensajeError>}
      <div className="flex items-center justify-end gap-3">
        {estado.ok && !pending && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
            <Check size={14} />
            {estado.mensaje}
          </span>
        )}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
