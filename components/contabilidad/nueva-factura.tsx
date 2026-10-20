'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialogo } from '@/components/ui/dialogo'
import { FormFactura, type OpcionesFactura } from '@/components/contabilidad/form-factura'
import type { Factura, TipoFactura } from '@/lib/supabase/types'

/** Botón + diálogo con el formulario de factura (alta o edición). */
export function NuevaFactura({
  tipo,
  factura,
  opciones,
  clienteFijo,
  trigger,
  triggerVariant = 'secondary',
  triggerSize = 'md',
  triggerTitle,
}: {
  tipo: TipoFactura
  factura?: Factura
  opciones: OpcionesFactura
  clienteFijo?: { id: string; nombre_cache: string }
  trigger: React.ReactNode
  triggerVariant?: 'primary' | 'secondary' | 'ghost'
  triggerSize?: 'sm' | 'md' | 'icon'
  triggerTitle?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const titulo = factura
    ? `Editar factura ${factura.numero}`
    : tipo === 'venta'
      ? 'Nueva factura de venta'
      : 'Nueva factura de compra'

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
        <FormFactura
          tipo={tipo}
          factura={factura}
          opciones={opciones}
          clienteFijo={clienteFijo}
          onOk={() => setAbierto(false)}
        />
      </Dialogo>
    </>
  )
}
