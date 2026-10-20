'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'

/** Ejecuta una Server Action sin argumentos (ya bindeada), con confirmación opcional. */
export function BotonAccion({
  action,
  confirmar,
  children,
  variant = 'ghost',
  size = 'sm',
  title,
}: {
  action: () => Promise<void>
  confirmar?: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'icon'
  title?: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      title={title}
      aria-label={title}
      disabled={pending}
      onClick={() => {
        if (confirmar && !window.confirm(confirmar)) return
        startTransition(() => action())
      }}
    >
      {children}
    </Button>
  )
}
