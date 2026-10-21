import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { ESTADOS_PROYECTO, TIPOS_PROYECTO, opciones } from '@/lib/catalogos'
import type { Proyecto } from '@/lib/supabase/types'

// Grupos de campos de los formularios (sin hooks: se renderizan desde Server
// Components y viajan como children de FormDialogo). Los name coinciden con los
// schemas zod de actions/.

export function CamposProyecto({ clienteId, proyecto }: { clienteId: string; proyecto?: Proyecto }) {
  return (
    <>
      <input type="hidden" name="cliente_id" value={clienteId} />
      {proyecto && <input type="hidden" name="id" value={proyecto.id} />}
      <Campo label="Nombre del proyecto">
        <Input name="nombre" required defaultValue={proyecto?.nombre} placeholder="Agente WhatsApp v1" />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Tipo">
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
        <Campo label="Entrega prevista">
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
