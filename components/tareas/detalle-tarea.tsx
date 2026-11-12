'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, ListChecks, Plus, Repeat, RotateCcw, Trash2 } from 'lucide-react'
import { Dialogo } from '@/components/ui/dialogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'
import { CamposTarea } from '@/components/tareas/campos-tarea'
import {
  agregarSubtarea,
  eliminarSubtarea,
  eliminarTarea,
  guardarTarea,
  marcarSubtarea,
  moverTarea,
} from '@/actions/tareas'
import { RESULTADO_INICIAL } from '@/lib/acciones'
import { clsx } from '@/lib/clsx'
import type { OpcionCliente, OpcionServicio, TareaConSubtareas } from '@/components/tareas/tipos'
import type { TareaSubtarea } from '@/lib/supabase/types'

/** Diálogo de una tarea: editar campos, checklist de subtareas, marcar hecha y eliminar. */
export function DetalleTarea({
  tarea,
  clientes,
  servicios,
  onCerrar,
  onCambio,
}: {
  tarea: TareaConSubtareas | null
  clientes: OpcionCliente[]
  servicios: OpcionServicio[]
  onCerrar: () => void
  onCambio: () => void
}) {
  return (
    <Dialogo abierto={!!tarea} onCerrar={onCerrar} titulo={tarea?.titulo ?? 'Tarea'}>
      {tarea && (
        <Contenido
          key={tarea.id}
          tarea={tarea}
          clientes={clientes}
          servicios={servicios}
          onCerrar={onCerrar}
          onCambio={onCambio}
        />
      )}
    </Dialogo>
  )
}

function Contenido({
  tarea,
  clientes,
  servicios,
  onCerrar,
  onCambio,
}: {
  tarea: TareaConSubtareas
  clientes: OpcionCliente[]
  servicios: OpcionServicio[]
  onCerrar: () => void
  onCambio: () => void
}) {
  const [estado, formAction, guardando] = useActionState(guardarTarea, RESULTADO_INICIAL)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (estado.ok) {
      onCambio()
      onCerrar()
    }
  }, [estado, onCambio, onCerrar])

  const hecha = tarea.estado === 'hecho'

  return (
    <div className="space-y-6">
      {tarea.recurrencia_id && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-lg bg-brand-500/[0.08] px-3 py-2 text-xs text-brand-200">
          <Repeat size={13} className="flex-shrink-0" />
          Creada automáticamente por una tarea recurrente.
          <Link href="/tareas/recurrentes" className="font-semibold underline-offset-2 hover:underline">
            Ver recurrentes
          </Link>
        </p>
      )}
      <form action={formAction} className="space-y-4">
        <CamposTarea tarea={tarea} clientes={clientes} servicios={servicios} mostrarEstado />
        {estado.error && <MensajeError>{estado.error}</MensajeError>}
        <div className="flex justify-end">
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>

      <Checklist tareaId={tarea.id} subtareas={tarea.subtareas} onCambio={onCambio} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline/[0.06] pt-4">
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`¿Eliminar «${tarea.titulo}»? Se borran también sus subtareas.`)) return
            startTransition(async () => {
              await eliminarTarea(tarea.id)
              onCambio()
              onCerrar()
            })
          }}
        >
          <Trash2 size={14} />
          Eliminar tarea
        </Button>
        <Button
          type="button"
          variant={hecha ? 'secondary' : 'primary'}
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await moverTarea(tarea.id, hecha ? 'por_hacer' : 'hecho')
              onCambio()
              onCerrar()
            })
          }
        >
          {hecha ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
          {hecha ? 'Reabrir' : 'Marcar como hecha'}
        </Button>
      </div>
    </div>
  )
}

function Checklist({
  tareaId,
  subtareas,
  onCambio,
}: {
  tareaId: string
  subtareas: TareaSubtarea[]
  onCambio: () => void
}) {
  // Copia local para marcar/borrar al instante; se resincroniza cuando llegan datos nuevos.
  const [items, setItems] = useState(subtareas)
  useEffect(() => setItems(subtareas), [subtareas])
  const [, startTransition] = useTransition()
  const [estado, formAction, anadiendo] = useActionState(agregarSubtarea, RESULTADO_INICIAL)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (estado.ok && inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
      onCambio()
    }
  }, [estado, onCambio])

  const hechas = items.filter((s) => s.hecha).length

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
        <ListChecks size={16} className="text-brand-300" />
        Checklist
        {items.length > 0 && (
          <span className="tabular text-xs font-medium text-ink/45">
            {hechas}/{items.length}
          </span>
        )}
      </h3>

      {items.length > 0 && (
        <ul className="mb-3 space-y-1">
          {items.map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-hairline/[0.04]">
              <input
                type="checkbox"
                checked={s.hecha}
                aria-label={s.texto}
                className="h-4 w-4 flex-shrink-0 cursor-pointer accent-brand-500"
                onChange={(e) => {
                  const hecha = e.target.checked
                  setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, hecha } : x)))
                  startTransition(async () => {
                    await marcarSubtarea(s.id, hecha)
                    onCambio()
                  })
                }}
              />
              <span className={clsx('min-w-0 flex-1 text-sm text-ink/85', s.hecha && 'text-ink/40 line-through')}>
                {s.texto}
              </span>
              <button
                type="button"
                title="Eliminar subtarea"
                aria-label="Eliminar subtarea"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-ink/30 hover:bg-hairline/5 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => {
                  setItems((prev) => prev.filter((x) => x.id !== s.id))
                  startTransition(async () => {
                    await eliminarSubtarea(s.id)
                    onCambio()
                  })
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="tarea_id" value={tareaId} />
        <Input ref={inputRef} name="texto" placeholder="Añadir un paso…" maxLength={300} required />
        <Button type="submit" variant="secondary" disabled={anadiendo} className="flex-shrink-0">
          <Plus size={15} />
          Añadir
        </Button>
      </form>
      {estado.error && <div className="mt-2"><MensajeError>{estado.error}</MensajeError></div>}
    </section>
  )
}
