import { Link2 } from 'lucide-react'
import { vincularOportunidad } from '@/actions/clientes'
import { FormDialogo } from '@/components/form-dialogo'
import { Campo, Select } from '@/components/ui/input'

/** Para clientes creados a mano: vincular con su oportunidad abierta (queda Ganada en GHL). */
export function VincularOportunidad({
  clienteId,
  oportunidades,
}: {
  clienteId: string
  oportunidades: { id: string; nombre: string; etapa: string }[]
}) {
  return (
    <FormDialogo
      titulo="Vincular con el pipeline"
      trigger={
        <>
          <Link2 size={14} />
          Vincular con el pipeline
        </>
      }
      triggerSize="sm"
      action={vincularOportunidad}
      submitLabel="Vincular y marcar como ganada"
    >
      <input type="hidden" name="cliente_id" value={clienteId} />
      <p className="text-sm text-ink/55">
        Elige la oportunidad de este cliente. Quedará como <span className="font-semibold text-emerald-300">Ganada</span>{' '}
        en el pipeline y dejará de contar como lead abierto.
      </p>
      {oportunidades.length === 0 ? (
        <p className="text-sm text-amber-200">No hay oportunidades abiertas en el pipeline.</p>
      ) : (
        <Campo label="Oportunidad">
          <Select name="opportunity_id" required defaultValue="">
            <option value="" disabled>
              Elige una oportunidad
            </option>
            {oportunidades.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre} · {o.etapa}
              </option>
            ))}
          </Select>
        </Campo>
      )}
    </FormDialogo>
  )
}
