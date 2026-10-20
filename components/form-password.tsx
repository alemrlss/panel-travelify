'use client'

import { useActionState } from 'react'
import { Check } from 'lucide-react'
import { cambiarPassword } from '@/actions/auth'
import { RESULTADO_INICIAL } from '@/lib/acciones'
import { Button } from '@/components/ui/button'
import { Campo, Input } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'

export function FormPassword() {
  const [estado, formAction, pending] = useActionState(cambiarPassword, RESULTADO_INICIAL)

  return (
    <form action={formAction} className="space-y-4">
      <Campo label="Nueva contraseña">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Campo>
      <Campo label="Repite la contraseña">
        <Input name="confirmar" type="password" required minLength={8} autoComplete="new-password" />
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
          {pending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}
