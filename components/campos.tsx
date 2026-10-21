import { Campo, Input, Select } from '@/components/ui/input'
import { hoyISO } from '@/lib/formato'
import { estadoServicio, estadosPosibles, siguienteEstado } from '@/lib/servicios'
import type { Cliente, Proyecto } from '@/lib/supabase/types'

// Grupos de campos de los formularios (sin hooks: se renderizan desde Server
// Components y viajan como children de FormDialogo). Los name coinciden con los
// schemas zod de actions/. El de servicio está en components/clientes/campos-servicio.tsx
// (es de cliente: el estado inicial depende del tipo de cobro elegido).

/** Datos propios del cliente: empresa y responsable obligatorios, teléfono y email opcionales. */
export function CamposCliente({
  cliente,
}: {
  cliente?: Partial<Pick<Cliente, 'empresa' | 'responsable' | 'telefono' | 'email'>>
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Empresa">
        <Input name="empresa" required defaultValue={cliente?.empresa ?? ''} placeholder="Nombre de la empresa" />
      </Campo>
      <Campo label="Responsable">
        <Input name="responsable" required defaultValue={cliente?.responsable ?? ''} placeholder="Nombre y apellidos" />
      </Campo>
      <Campo label="Teléfono">
        <Input name="telefono" type="tel" defaultValue={cliente?.telefono ?? ''} placeholder="+34 600 000 000" />
      </Campo>
      <Campo label="Email">
        <Input name="email" type="email" defaultValue={cliente?.email ?? ''} placeholder="contacto@empresa.com" />
      </Campo>
    </div>
  )
}

/**
 * Cambio de estado de un servicio, con la fecha real en que pasó y un motivo
 * opcional. Solo ofrece los estados válidos para su tipo de cobro y propone el
 * siguiente paso lógico.
 */
export function CamposEstadoServicio({ servicio }: { servicio: Pick<Proyecto, 'id' | 'nombre' | 'estado' | 'cobro'> }) {
  const opciones = estadosPosibles(servicio.cobro).filter((e) => e !== servicio.estado)
  return (
    <>
      <input type="hidden" name="id" value={servicio.id} />
      <p className="text-sm text-ink/60">
        «{servicio.nombre}» · ahora: {estadoServicio(servicio.estado, servicio.cobro).label}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nuevo estado" htmlFor={`estado-${servicio.id}`}>
          <Select id={`estado-${servicio.id}`} name="estado" defaultValue={siguienteEstado(servicio.estado, servicio.cobro)}>
            {opciones.map((e) => (
              <option key={e} value={e}>
                {estadoServicio(e, servicio.cobro).label}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Fecha" htmlFor={`fecha-${servicio.id}`}>
          <Input id={`fecha-${servicio.id}`} name="fecha" type="date" required defaultValue={hoyISO()} />
        </Campo>
      </div>
      <Campo label="Motivo o comentario (opcional)" htmlFor={`motivo-${servicio.id}`}>
        <Input id={`motivo-${servicio.id}`} name="motivo" placeholder="Ej.: el cliente lo aprobó, recorte de presupuesto…" />
      </Campo>
    </>
  )
}
