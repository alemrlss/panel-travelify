'use client'

import { useState } from 'react'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { TIPOS_COBRO, TIPOS_PROYECTO, opciones } from '@/lib/catalogos'
import { centsAEurosInput } from '@/lib/formato'
import { esRecurrente, estadoServicio } from '@/lib/servicios'
import type { Proyecto, TipoCobro } from '@/lib/supabase/types'

/**
 * Campos de un servicio contratado. El estado inicial solo se elige al crear un
 * pago único (los recurrentes empiezan "En curso"); después el estado se cambia
 * con "Cambiar estado" para que quede la fecha en el historial.
 */
export function CamposServicio({ clienteId, proyecto }: { clienteId: string; proyecto?: Proyecto }) {
  const [cobro, setCobro] = useState<TipoCobro>(proyecto?.cobro ?? 'mensual')
  const id = proyecto?.id ?? 'nuevo'

  return (
    <>
      <input type="hidden" name="cliente_id" value={clienteId} />
      {proyecto && <input type="hidden" name="id" value={proyecto.id} />}
      <Campo label="Nombre del servicio" htmlFor={`nombre-${id}`}>
        <Input
          id={`nombre-${id}`}
          name="nombre"
          required
          defaultValue={proyecto?.nombre}
          placeholder="Gestión de redes · Instagram y TikTok"
        />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Tipo de servicio" htmlFor={`tipo-${id}`}>
          <Select id={`tipo-${id}`} name="tipo" defaultValue={proyecto?.tipo ?? 'redes'}>
            {opciones(TIPOS_PROYECTO).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Cobro" htmlFor={`cobro-${id}`}>
          <Select id={`cobro-${id}`} name="cobro" value={cobro} onChange={(e) => setCobro(e.target.value as TipoCobro)}>
            {opciones(TIPOS_COBRO).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Importe (€)" htmlFor={`importe-${id}`}>
          <Input
            id={`importe-${id}`}
            name="importe"
            inputMode="decimal"
            defaultValue={proyecto?.importe_cents != null ? centsAEurosInput(proyecto.importe_cents) : ''}
            placeholder={esRecurrente(cobro) ? '350,00' : '1.500,00'}
          />
        </Campo>
        <Campo label={esRecurrente(cobro) ? 'Fecha de alta' : 'Fecha de contratación'} htmlFor={`inicio-${id}`}>
          <Input id={`inicio-${id}`} name="fecha_inicio" type="date" defaultValue={proyecto?.fecha_inicio ?? ''} />
        </Campo>
        {!proyecto && !esRecurrente(cobro) && (
          <Campo label="Estado inicial" htmlFor={`estado-${id}`}>
            <Select id={`estado-${id}`} name="estado" defaultValue="planificado">
              {(['planificado', 'en_curso', 'en_revision', 'entregado'] as const).map((e) => (
                <option key={e} value={e}>
                  {estadoServicio(e, cobro).label}
                </option>
              ))}
            </Select>
          </Campo>
        )}
      </div>
      <p className="-mt-1 text-xs text-ink/40">
        {esRecurrente(cobro)
          ? 'Recurrente: empieza "En curso" y suma al recurrente mensual hasta que lo des de baja.'
          : 'Pago único: Planificado → En curso → En revisión → Entregado. Cuenta como ingreso al entregarlo.'}{' '}
        Pon lo que le cobras de verdad, con el descuento ya aplicado.
      </p>
      <Campo label="Enlace (web, repo, panel…)" htmlFor={`url-${id}`}>
        <Input id={`url-${id}`} name="url" type="url" defaultValue={proyecto?.url ?? ''} placeholder="https://" />
      </Campo>
      <Campo label="Notas" htmlFor={`notas-${id}`}>
        <Textarea id={`notas-${id}`} name="notas" defaultValue={proyecto?.notas ?? ''} />
      </Campo>
    </>
  )
}
