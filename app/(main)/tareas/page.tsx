import { ListTodo, Plus } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { hoyISO, haceDias } from '@/lib/formato'
import { DIAS_HECHAS, ORDEN_ESTADOS, ordenarTareas, urlTareas, vencimiento } from '@/lib/tareas'
import { guardarTarea } from '@/actions/tareas'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Aviso } from '@/components/ui/card'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { FormDialogo } from '@/components/form-dialogo'
import { CamposTarea } from '@/components/tareas/campos-tarea'
import { FiltrosTareas } from '@/components/tareas/filtros-tareas'
import { PestanasTareas } from '@/components/tareas/pestanas-tareas'
import { TareasBoard, type ColumnaTareas } from '@/components/tareas/tareas-board'
import type { PrioridadTarea } from '@/lib/supabase/types'
import type { TareaConSubtareas } from '@/components/tareas/tipos'

const UUID = /^[0-9a-f-]{36}$/i
const PRIORIDADES_VALIDAS: PrioridadTarea[] = ['alta', 'media', 'baja']

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; prioridad?: string; hechas?: string; tarea?: string }>
}) {
  await requireUser()
  const sp = await searchParams
  const cliente = sp.cliente === 'sin' || (sp.cliente && UUID.test(sp.cliente)) ? sp.cliente : undefined
  const prioridad = PRIORIDADES_VALIDAS.includes(sp.prioridad as PrioridadTarea) ? (sp.prioridad as PrioridadTarea) : undefined
  const todasHechas = sp.hechas === 'todas'
  const hoy = hoyISO()

  const supabase = await createClient()
  let query = supabase.from('tareas').select('*')
  if (cliente === 'sin') query = query.is('cliente_id', null)
  else if (cliente) query = query.eq('cliente_id', cliente)
  if (prioridad) query = query.eq('prioridad', prioridad)
  // Hechas: solo las recientes salvo ?hechas=todas. Nada se borra.
  if (!todasHechas) query = query.or(`estado.neq.hecho,completada_at.gte.${haceDias(DIAS_HECHAS, hoy)}`)

  const [{ data: tareas, error }, { data: clientes }, { data: servicios }] = await Promise.all([
    query,
    supabase.from('clientes').select('id, empresa, estado').order('empresa'),
    supabase.from('proyectos').select('id, cliente_id, nombre').order('created_at'),
  ])

  const ids = (tareas ?? []).map((t) => t.id)
  const { data: subtareas } = ids.length
    ? await supabase.from('tarea_subtareas').select('*').in('tarea_id', ids).order('orden')
    : { data: [] }

  const conSubtareas: TareaConSubtareas[] = (tareas ?? []).map((t) => ({
    ...t,
    subtareas: (subtareas ?? []).filter((s) => s.tarea_id === t.id),
  }))
  const columnas: ColumnaTareas[] = ORDEN_ESTADOS.map((estado) => ({
    estado,
    tareas: ordenarTareas(
      conSubtareas.filter((t) => t.estado === estado),
      hoy
    ),
  }))

  const pendientes = conSubtareas.filter((t) => t.estado !== 'hecho')
  const vencidas = pendientes.filter((t) => vencimiento(t.fecha_limite, t.estado, hoy) === 'vencida').length
  const paraHoy = pendientes.filter((t) => vencimiento(t.fecha_limite, t.estado, hoy) === 'hoy').length
  const filtros = { cliente, prioridad }

  return (
    <PageContainer ancho>
      <PageHeader
        title="Tareas"
        action={
          <FormDialogo
            titulo="Nueva tarea"
            trigger={
              <>
                <Plus size={15} />
                Tarea
              </>
            }
            triggerVariant="primary"
            action={guardarTarea}
            submitLabel="Crear tarea"
          >
            <CamposTarea
              clientes={clientes ?? []}
              servicios={servicios ?? []}
              clienteIdInicial={cliente && cliente !== 'sin' ? cliente : undefined}
            />
          </FormDialogo>
        }
      />

      <PestanasTareas activa="tablero" />

      {error && <Aviso>No se pudieron cargar las tareas: {error.message}</Aviso>}

      <FiltrosTareas clientes={clientes ?? []} filtros={{ ...filtros, hechas: todasHechas ? 'todas' : undefined }} />

      <p className="mb-4 text-sm text-ink/50">
        <span className="font-semibold text-ink">{pendientes.length}</span> pendientes
        {vencidas > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-red-300">{vencidas}</span> {vencidas === 1 ? 'vencida' : 'vencidas'}
          </>
        )}
        {paraHoy > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-amber-300">{paraHoy}</span> para hoy
          </>
        )}
      </p>

      {!error && conSubtareas.length === 0 && !cliente && !prioridad && !todasHechas ? (
        <EstadoVacio
          icon={<ListTodo size={20} />}
          titulo="Todavía no tienes tareas"
          texto="Crea la primera con el botón Tarea. Puedes vincularla a un cliente y a uno de sus servicios."
        />
      ) : (
        <TareasBoard
          columnasIniciales={columnas}
          clientes={clientes ?? []}
          servicios={servicios ?? []}
          hoy={hoy}
          tareaInicial={sp.tarea && UUID.test(sp.tarea) ? sp.tarea : undefined}
          hechasHref={urlTareas({ ...filtros, hechas: todasHechas ? undefined : 'todas' })}
          verTodasHechas={todasHechas}
        />
      )}
    </PageContainer>
  )
}
