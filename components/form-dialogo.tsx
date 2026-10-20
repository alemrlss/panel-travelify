'use client'

import { useActionState, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialogo } from '@/components/ui/dialogo'
import { RESULTADO_INICIAL, type Resultado } from '@/lib/acciones'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

/**
 * Botón que abre un diálogo con un formulario conectado a una Server Action
 * `(prev, formData) => Resultado`. Los campos llegan como children (pueden
 * venir de un Server Component); se cierra solo cuando la acción devuelve ok.
 */
export function FormDialogo({
  titulo,
  trigger,
  triggerVariant = 'secondary',
  triggerSize = 'md',
  triggerTitle,
  action,
  submitLabel = 'Guardar',
  children,
}: {
  titulo: string
  trigger: React.ReactNode
  triggerVariant?: Variant
  triggerSize?: 'sm' | 'md' | 'icon'
  triggerTitle?: string
  action: (prev: Resultado, formData: FormData) => Promise<Resultado>
  submitLabel?: string
  children: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        title={triggerTitle}
        aria-label={triggerTitle}
        onClick={() => setAbierto(true)}
      >
        {trigger}
      </Button>
      <Dialogo abierto={abierto} onCerrar={() => setAbierto(false)} titulo={titulo}>
        <Formulario action={action} submitLabel={submitLabel} onOk={() => setAbierto(false)}>
          {children}
        </Formulario>
      </Dialogo>
    </>
  )
}

// Montado solo con el diálogo abierto (ver Dialogo): cada apertura arranca con
// el estado limpio, sin el error o el ok de la vez anterior.
function Formulario({
  action,
  submitLabel,
  onOk,
  children,
}: {
  action: (prev: Resultado, formData: FormData) => Promise<Resultado>
  submitLabel: string
  onOk: () => void
  children: React.ReactNode
}) {
  const [estado, formAction, pending] = useActionState(action, RESULTADO_INICIAL)

  useEffect(() => {
    if (estado.ok) onOk()
  }, [estado, onOk])

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {estado.error && <MensajeError>{estado.error}</MensajeError>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export function MensajeError({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
      {children}
    </p>
  )
}
