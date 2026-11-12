'use client'

import { useState } from 'react'
import { Repeat } from 'lucide-react'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { CamposClienteServicio } from '@/components/tareas/campos-tarea'
import { PRIORIDADES } from '@/lib/tareas'
import { DIAS_SEMANA, PLAZOS, describirRegla, proximaFecha } from '@/lib/recurrencias'
import { fechaCorta } from '@/lib/tareas'
import { clsx } from '@/lib/clsx'
import type { PrioridadTarea, TareaRecurrencia, TipoRecurrencia } from '@/lib/supabase/types'
import type { OpcionCliente, OpcionServicio } from '@/components/tareas/tipos'

const TIPOS: { tipo: TipoRecurrencia; label: string }[] = [
  { tipo: 'cada_n_dias', label: 'Cada N días' },
  { tipo: 'dia_mes', label: 'Día del mes' },
  { tipo: 'dias_semana', label: 'Días de la semana' },
]

export function CamposRecurrencia({
  recurrencia,
  clientes,
  servicios,
  hoy,
}: {
  recurrencia?: TareaRecurrencia
  clientes: OpcionCliente[]
  servicios: OpcionServicio[]
  hoy: string
}) {
  const id = recurrencia?.id ?? 'nueva-rec'
  const [tipo, setTipo] = useState<TipoRecurrencia>(recurrencia?.tipo ?? 'cada_n_dias')
  const [cadaDias, setCadaDias] = useState(String(recurrencia?.cada_dias ?? 5))
  const [diaMes, setDiaMes] = useState(String(recurrencia?.dia_mes ?? 1))
  const [dias, setDias] = useState<number[]>(recurrencia?.dias_semana ?? [1])
  const [plazo, setPlazo] = useState(String(recurrencia?.plazo_dias ?? 0))
  const [inicio, setInicio] = useState(recurrencia?.fecha_inicio ?? hoy)

  const regla = {
    tipo,
    cada_dias: Number(cadaDias) || null,
    dia_mes: Number(diaMes) || null,
    dias_semana: dias,
    fecha_inicio: inicio || hoy,
    plazo_dias: Number(plazo) || 0,
  }
  const valida =
    (tipo === 'cada_n_dias' && !!regla.cada_dias && regla.cada_dias >= 1) ||
    (tipo === 'dia_mes' && !!regla.dia_mes) ||
    (tipo === 'dias_semana' && dias.length > 0)
  const proxima = valida ? proximaFecha(regla, hoy) : null

  return (
    <>
      {recurrencia && <input type="hidden" name="id" value={recurrencia.id} />}
      <input type="hidden" name="tipo" value={tipo} />

      <Campo label="Título" htmlFor={`titulo-${id}`}>
        <Input
          id={`titulo-${id}`}
          name="titulo"
          required
          maxLength={200}
          defaultValue={recurrencia?.titulo ?? ''}
          placeholder="Ej. Informe mensual de resultados"
        />
      </Campo>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink/70">Se repite</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-hairline/10 bg-elevated p-1">
          {TIPOS.map((t) => (
            <button
              key={t.tipo}
              type="button"
              onClick={() => setTipo(t.tipo)}
              aria-pressed={tipo === t.tipo}
              className={clsx(
                'rounded-lg px-2 py-2 text-xs font-semibold transition-colors',
                tipo === t.tipo ? 'bg-brand-600 text-white' : 'text-ink/55 hover:text-ink'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tipo === 'cada_n_dias' && (
          <div className="flex items-center gap-2 text-sm text-ink/70">
            Cada
            <Input
              name="cada_dias"
              type="number"
              min={1}
              max={365}
              required
              value={cadaDias}
              onChange={(e) => setCadaDias(e.target.value)}
              className="w-24"
              aria-label="Cada cuántos días"
            />
            días
          </div>
        )}

        {tipo === 'dia_mes' && (
          <Select name="dia_mes" value={diaMes} onChange={(e) => setDiaMes(e.target.value)} aria-label="Día del mes">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d === 31 ? 'Último día del mes' : `Día ${d}`}
              </option>
            ))}
          </Select>
        )}

        {tipo === 'dias_semana' && (
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA.map((d) => {
              const marcado = dias.includes(d.n)
              return (
                <label
                  key={d.n}
                  title={d.label}
                  className={clsx(
                    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                    marcado ? 'border-brand-500 bg-brand-600 text-white' : 'border-hairline/10 bg-elevated text-ink/55 hover:text-ink'
                  )}
                >
                  <input
                    type="checkbox"
                    name="dias_semana"
                    value={d.n}
                    checked={marcado}
                    onChange={(e) =>
                      setDias((prev) => (e.target.checked ? [...prev, d.n] : prev.filter((x) => x !== d.n)))
                    }
                    className="sr-only"
                    aria-label={d.label}
                  />
                  {d.corto}
                </label>
              )
            })}
          </div>
        )}

        <p className="flex items-center gap-1.5 rounded-lg bg-brand-500/[0.08] px-3 py-2 text-xs text-brand-200">
          <Repeat size={13} className="flex-shrink-0" />
          {valida ? (
            <>
              {describirRegla(regla)}
              {proxima && ` · próxima: ${proxima === hoy ? 'hoy' : fechaCorta(proxima)}`}
            </>
          ) : (
            'Completa la regla de repetición'
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Empieza el" htmlFor={`inicio-${id}`}>
          <Input
            id={`inicio-${id}`}
            name="fecha_inicio"
            type="date"
            required
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </Campo>
        <Campo label="Plazo para hacerla" htmlFor={`plazo-${id}`}>
          <Select id={`plazo-${id}`} name="plazo_dias" value={plazo} onChange={(e) => setPlazo(e.target.value)}>
            {PLAZOS.map((p) => (
              <option key={p.dias} value={p.dias}>
                {p.label}
              </option>
            ))}
            {!PLAZOS.some((p) => String(p.dias) === plazo) && <option value={plazo}>{plazo} días</option>}
          </Select>
        </Campo>
        <CamposClienteServicio
          idBase={id}
          clienteInicial={recurrencia?.cliente_id}
          servicioInicial={recurrencia?.proyecto_id}
          clientes={clientes}
          servicios={servicios}
        />
        <Campo label="Prioridad" htmlFor={`prioridad-${id}`}>
          <Select id={`prioridad-${id}`} name="prioridad" defaultValue={recurrencia?.prioridad ?? 'media'}>
            {(Object.keys(PRIORIDADES) as PrioridadTarea[]).map((p) => (
              <option key={p} value={p}>
                {PRIORIDADES[p].label}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <Campo label="Descripción" htmlFor={`descripcion-${id}`}>
        <Textarea id={`descripcion-${id}`} name="descripcion" defaultValue={recurrencia?.descripcion ?? ''} />
      </Campo>
      <Campo label="Checklist (un paso por línea)" htmlFor={`subtareas-${id}`}>
        <Textarea
          id={`subtareas-${id}`}
          name="subtareas"
          defaultValue={recurrencia?.subtareas.join('\n') ?? ''}
          placeholder={'Revisar métricas\nPreparar el informe\nEnviarlo al cliente'}
        />
      </Campo>
    </>
  )
}
