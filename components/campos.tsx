import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { ESTADOS_PROYECTO, TIPOS_PROYECTO, opciones } from '@/lib/catalogos'
import type { Cliente, Proyecto } from '@/lib/supabase/types'

// Grupos de campos de los formularios (sin hooks: se renderizan desde Server
// Components y viajan como children de FormDialogo). Los name coinciden con los
// schemas zod de actions/.

export function CamposProyecto({ clienteId, proyecto }: { clienteId: string; proyecto?: Proyecto }) {
  return (
    <>
      <input type="hidden" name="cliente_id" value={clienteId} />
      {proyecto && <input type="hidden" name="id" value={proyecto.id} />}
      <Campo label="Nombre del servicio">
        <Input name="nombre" required defaultValue={proyecto?.nombre} placeholder="Agente WhatsApp v1" />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Tipo de servicio">
          <Select name="tipo" defaultValue={proyecto?.tipo ?? 'agente_whatsapp'}>
            {opciones(TIPOS_PROYECTO).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Estado">
          <Select name="estado" defaultValue={proyecto?.estado ?? 'planificado'}>
            {opciones(ESTADOS_PROYECTO).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Inicio">
          <Input name="fecha_inicio" type="date" defaultValue={proyecto?.fecha_inicio ?? ''} />
        </Campo>
        <Campo label="Entrega / fin previsto">
          <Input name="fecha_entrega" type="date" defaultValue={proyecto?.fecha_entrega ?? ''} />
        </Campo>
      </div>
      <Campo label="Enlace (web, repo, panel…)">
        <Input name="url" type="url" defaultValue={proyecto?.url ?? ''} placeholder="https://" />
      </Campo>
      <Campo label="Notas">
        <Textarea name="notas" defaultValue={proyecto?.notas ?? ''} />
      </Campo>
    </>
  )
}

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
