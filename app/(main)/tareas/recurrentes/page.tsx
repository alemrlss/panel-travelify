import { ListChecks, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { hoyISO } from '@/lib/formato'
import { PRIORIDADES } from '@/lib/tareas'
import { describirRegla, textoProxima } from '@/lib/recurrencias'
import { eliminarRecurrencia, guardarRecurrencia, pausarRecurrencia } from '@/actions/recurrencias'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Aviso, Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { CamposRecurrencia } from '@/components/tareas/campos-recurrencia'
import { PestanasTareas } from '@/components/tareas/pestanas-tareas'
import { clsx } from '@/lib/clsx'

export default async function RecurrentesPage() {
  await requireUser()
  const supabase = await createClient()
  const hoy = hoyISO()

  const [{ data: recurrencias, error }, { data: clientes }, { data: servicios }] = await Promise.all([
    supabase.from('tarea_recurrencias').select('*').order('activa', { ascending: false }).order('created_at'),
    supabase.from('clientes').select('id, empresa, estado').order('empresa'),
    supabase.from('proyectos').select('id, cliente_id, nombre').order('created_at'),
  ])
  const nombreCliente = Object.fromEntries((clientes ?? []).map((c) => [c.id, c.empresa]))
  const nombreServicio = Object.fromEntries((servicios ?? []).map((s) => [s.id, s.nombre]))

  const campos = (r?: NonNullable<typeof recurrencias>[number]) => (
    <CamposRecurrencia recurrencia={r} clientes={clientes ?? []} servicios={servicios ?? []} hoy={hoy} />
  )

  return (
    <PageContainer>
      <PageHeader
        title="Tareas"
        action={
          <FormDialogo
            titulo="Nueva tarea recurrente"
            trigger={
              <>
                <Plus size={15} />
                Recurrente
              </>
            }
            triggerVariant="primary"
            action={guardarRecurrencia}
            submitLabel="Crear recurrente"
          >
            {campos()}
          </FormDialogo>
        }
      />
      <PestanasTareas activa="recurrentes" />

      {error && <Aviso>No se pudieron cargar las recurrentes: {error.message}</Aviso>}

      <p className="mb-4 text-sm text-ink/50">
        Se crean solas cada mañana en «Por hacer», aunque la anterior siga pendiente.
      </p>

      {!error && !recurrencias?.length ? (
        <EstadoVacio
          icon={<Repeat size={20} />}
          titulo="Sin tareas recurrentes"
          texto="Crea una para que se genere sola cada cierto tiempo, por ejemplo un informe el día 1 de cada mes."
        />
      ) : (
        <Card className="p-2 sm:p-2">
          <ul className="divide-y divide-hairline/[0.06]">
            {(recurrencias ?? []).map((r) => {
              const contexto = [r.cliente_id && nombreCliente[r.cliente_id], r.proyecto_id && nombreServicio[r.proyecto_id]]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={r.id} className={clsx('flex flex-wrap items-center gap-3 px-3 py-3.5', !r.activa && 'opacity-60')}>
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                    <Repeat size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{r.titulo}</p>
                    <p className="truncate text-xs text-ink/45">
                      {describirRegla(r)}
                      {contexto ? ` · ${contexto}` : ' · Interna'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={r.activa ? 'brand' : 'neutral'}>{textoProxima(r, hoy)}</Badge>
                      <Badge tone={PRIORIDADES[r.prioridad].tone}>{PRIORIDADES[r.prioridad].label}</Badge>
                      {r.subtareas.length > 0 && (
                        <Badge tone="neutral">
                          <ListChecks size={12} />
                          {r.subtareas.length} {r.subtareas.length === 1 ? 'paso' : 'pasos'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center">
                    <FormDialogo
                      titulo="Editar tarea recurrente"
                      trigger={<Pencil size={15} />}
                      triggerVariant="ghost"
                      triggerSize="icon"
                      triggerTitle="Editar"
                      action={guardarRecurrencia}
                    >
                      {campos(r)}
                    </FormDialogo>
                    <BotonAccion
                      action={pausarRecurrencia.bind(null, r.id, !r.activa)}
                      size="icon"
                      title={r.activa ? 'Pausar' : 'Reanudar'}
                    >
                      {r.activa ? <Pause size={15} /> : <Play size={15} />}
                    </BotonAccion>
                    <BotonAccion
                      action={eliminarRecurrencia.bind(null, r.id)}
                      confirmar={`¿Eliminar la recurrente «${r.titulo}»? Las tareas ya creadas se quedan en el tablero.`}
                      size="icon"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </BotonAccion>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </PageContainer>
  )
}
