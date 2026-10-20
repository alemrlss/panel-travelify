'use client'

import { useState, useTransition } from 'react'
import { FileText } from 'lucide-react'
import { urlPdfFactura } from '@/actions/contabilidad'
import { Button } from '@/components/ui/button'

/** Pide una URL firmada (5 min) y abre el PDF en una pestaña nueva. */
export function BotonPdf({ facturaId }: { facturaId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={error ?? 'Ver archivo'}
      aria-label="Ver archivo"
      disabled={pending}
      className={error ? 'text-red-300' : undefined}
      onClick={() => {
        // La pestaña se abre antes del await: si no, el navegador la bloquea como popup.
        const pestaña = window.open('', '_blank')
        startTransition(async () => {
          const res = await urlPdfFactura(facturaId)
          if (res.url && pestaña) pestaña.location.href = res.url
          else {
            pestaña?.close()
            setError(res.error ?? 'No se pudo abrir el archivo')
          }
        })
      }}
    >
      <FileText size={15} />
    </Button>
  )
}
