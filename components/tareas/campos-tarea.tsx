'use client'

import { useState } from 'react'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { ESTADOS_TAREA, ORDEN_ESTADOS, PRIORIDADES } from '@/lib/tareas'
import type { PrioridadTarea, Tarea } from '@/lib/supabase/types'
import type { OpcionCliente, OpcionServicio } from '@/components/tareas/tipos'

/** Campos de crear/editar tarea. El servicio se filtra por el cliente elegido. */
export function CamposTarea({
  tarea,
  clienteIdInicial,
  clientes,
  servicios,
  mostrarEstado = false,
}: {
  tarea?: Tarea
  clienteIdInicial?: string
  clientes: OpcionCliente[]
  servicios: OpcionServicio[]
  mostrarEstado?: boolean
}) {
  const id = tarea?.id ?? 'nueva'

  return (
    <>
      {tarea && <input type="hidden" name="id" value={tarea.id} />}
      <Campo label="Título" htmlFor={`titulo-${id}`}>
        <Input
          id={`titulo-${id}`}
          name="titulo"
          required
          maxLength={200}
          defaultValue={tarea?.titulo ?? ''}
          placeholder="Ej. Revisar el flujo de WhatsApp"
        />
      </Campo>
      <Campo label="Descripción" htmlFor={`descripcion-${id}`}>
        <Textarea id={`descripcion-${id}`} name="descripcion" defaultValue={tarea?.descripcion ?? ''} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <CamposClienteServicio
          idBase={id}
          clienteInicial={tarea?.cliente_id ?? clienteIdInicial}
          servicioInicial={tarea?.proyecto_id ?? undefined}
          clientes={clientes}
          servicios={servicios}
        />
        <Campo label="Prioridad" htmlFor={`prioridad-${id}`}>
          <Select id={`prioridad-${id}`} name="prioridad" defaultValue={tarea?.prioridad ?? 'media'}>
            {(Object.keys(PRIORIDADES) as PrioridadTarea[]).map((p) => (
              <option key={p} value={p}>
                {PRIORIDADES[p].label}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Fecha límite" htmlFor={`fecha-${id}`}>
          <Input id={`fecha-${id}`} name="fecha_limite" type="date" defaultValue={tarea?.fecha_limite ?? ''} />
        </Campo>
        {mostrarEstado && (
          <Campo label="Estado" htmlFor={`estado-${id}`}>
            <Select id={`estado-${id}`} name="estado" defaultValue={tarea?.estado ?? 'por_hacer'}>
              {ORDEN_ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ESTADOS_TAREA[e].label}
                </option>
              ))}
            </Select>
          </Campo>
        )}
      </div>
    </>
  )
}

/** Cliente + servicio (filtrado por el cliente). Mismo formulario en tareas y recurrentes. */
export function CamposClienteServicio({
  idBase,
  clienteInicial,
  servicioInicial,
  clientes,
  servicios,
}: {
  idBase: string
  clienteInicial?: string | null
  servicioInicial?: string | null
  clientes: OpcionCliente[]
  servicios: OpcionServicio[]
}) {
  const id = idBase
  const [clienteId, setClienteId] = useState(clienteInicial ?? '')
  const [servicioId, setServicioId] = useState(servicioInicial ?? '')

  // Los clientes dados de baja solo aparecen si ya están elegidos.
  const opcionesClientes = clientes.filter((c) => c.estado !== 'finalizado' || c.id === clienteId)
  const opcionesServicios = servicios.filter((s) => s.cliente_id === clienteId)

  return (
    <>
        <Campo label="Cliente" htmlFor={`cliente-${id}`}>
          <Select
            id={`cliente-${id}`}
            name="cliente_id"
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value)
              setServicioId('')
            }}
          >
            <option value="">Sin cliente (interna)</option>
            {opcionesClientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.empresa}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Servicio" htmlFor={`servicio-${id}`}>
          <Select
            id={`servicio-${id}`}
            name="proyecto_id"
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            disabled={!clienteId || opcionesServicios.length === 0}
          >
            <option value="">Ninguno</option>
            {opcionesServicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </Campo>
    </>
  )
}
