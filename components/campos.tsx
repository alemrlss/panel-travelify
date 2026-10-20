import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import {
  ESTADOS_PROYECTO,
  METODOS_PAGO,
  TIPOS_COBRO,
  TIPOS_PROYECTO,
  opciones,
} from '@/lib/catalogos'
import { centsAEurosInput, hoyISO } from '@/lib/formato'
import type { Pago, Proyecto, ServicioContratado } from '@/lib/supabase/types'

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

export function CamposServicio({
  clienteId,
  proyectos,
  servicio,
}: {
  clienteId: string
  proyectos: Pick<Proyecto, 'id' | 'nombre'>[]
  servicio?: ServicioContratado
}) {
  return (
    <>
      <input type="hidden" name="cliente_id" value={clienteId} />
      {servicio && <input type="hidden" name="id" value={servicio.id} />}
      <Campo label="Concepto">
        <Input
          name="concepto"
          required
          defaultValue={servicio?.concepto}
          placeholder="Mantenimiento Agente WhatsApp"
        />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Tipo de cobro">
          <Select name="tipo_cobro" defaultValue={servicio?.tipo_cobro ?? 'recurrente_mensual'}>
            {opciones(TIPOS_COBRO).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Importe (€)">
          <Input
            name="importe"
            required
            inputMode="decimal"
            defaultValue={servicio ? centsAEurosInput(servicio.importe_cents) : ''}
            placeholder="497,00"
          />
        </Campo>
        <Campo label="Día de cobro (solo mensual)">
          <Input
            name="dia_cobro"
            type="number"
            min={1}
            max={28}
            defaultValue={servicio?.dia_cobro ?? 1}
          />
        </Campo>
        <Campo label="Proyecto (opcional)">
          <Select name="proyecto_id" defaultValue={servicio?.proyecto_id ?? ''}>
            <option value="">— Ninguno —</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="Inicio (o fecha del pago único)">
          <Input
            name="fecha_inicio"
            type="date"
            required
            defaultValue={servicio?.fecha_inicio ?? hoyISO()}
          />
        </Campo>
        <Campo label="Fin (opcional)">
          <Input name="fecha_fin" type="date" defaultValue={servicio?.fecha_fin ?? ''} />
        </Campo>
      </div>
      {!servicio && (
        <p className="text-xs text-ink/45">
          Un pago único crea su cobro pendiente al guardarlo. Los mensuales se generan desde
          Facturación con “Generar cobros del mes”.
        </p>
      )}
    </>
  )
}

export function CamposPago({
  clientes,
  clienteId,
}: {
  clientes: { id: string; nombre_cache: string }[]
  clienteId?: string
}) {
  return (
    <>
      {clienteId ? (
        <input type="hidden" name="cliente_id" value={clienteId} />
      ) : (
        <Campo label="Cliente">
          <Select name="cliente_id" required defaultValue="">
            <option value="" disabled>
              Elige un cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_cache}
              </option>
            ))}
          </Select>
        </Campo>
      )}
      <Campo label="Concepto">
        <Input name="concepto" required placeholder="Setup inicial" />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Importe (€)">
          <Input name="importe" required inputMode="decimal" placeholder="1.500,00" />
        </Campo>
        <Campo label="Vence el">
          <Input name="fecha_vencimiento" type="date" required defaultValue={hoyISO()} />
        </Campo>
      </div>
      <Campo label="Notas">
        <Textarea name="notas" />
      </Campo>
    </>
  )
}

export function CamposMarcarPagado({ pago }: { pago: Pick<Pago, 'id' | 'concepto'> }) {
  return (
    <>
      <input type="hidden" name="id" value={pago.id} />
      <p className="text-sm text-ink/60">{pago.concepto}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Fecha de pago">
          <Input name="fecha_pago" type="date" required defaultValue={hoyISO()} />
        </Campo>
        <Campo label="Método">
          <Select name="metodo" defaultValue="Transferencia">
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
    </>
  )
}
