import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  FileSignature,
  FolderKanban,
  History,
  KanbanSquare,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserX,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { searchOpportunities, getPipelineStages } from '@/lib/ghl/client'
import { antiguedad, formatEUR, formatFecha, getContactoNombre, hoyISO, waLink } from '@/lib/formato'
import { ESTADOS_CLIENTE, TIPOS_COBRO, TIPOS_PROYECTO } from '@/lib/catalogos'
import { esRecurrente, estadoServicio, pagosUnicos, pagosUnicosEnMarcha, recurrenteMensual } from '@/lib/servicios'
import { eliminarCliente, setEstadoCliente } from '@/actions/clientes'
import { cambiarEstadoServicio, eliminarProyecto, guardarProyecto } from '@/actions/proyectos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { Dato } from '@/components/dato'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { CamposEstadoServicio } from '@/components/campos'
import { CamposServicio } from '@/components/clientes/campos-servicio'
import { FormCliente } from '@/components/clientes/form-cliente'
import { Contratos } from '@/components/clientes/contratos'
import { Historial } from '@/components/clientes/historial'
import { VincularOportunidad } from '@/components/clientes/vincular-oportunidad'
import { clsx } from '@/lib/clsx'
import type { EstadoProyecto } from '@/lib/supabase/types'

// Primero lo vivo (en curso, en revisión, planificado), luego lo entregado y al final las bajas.
const ORDEN_ESTADO: Record<EstadoProyecto, number> = { en_curso: 0, en_revision: 1, planificado: 2, entregado: 3, baja: 4 }

export default async function ClientePage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  await requireUser()
  const { clientId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) notFound()

  const supabase = await createClient()
  const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clientId).maybeSingle()
  if (!cliente) notFound()

  const [{ data: proyectos }, { data: contratos }, { data: eventos }, oportunidades] = await Promise.all([
    supabase.from('proyectos').select('*').eq('cliente_id', clientId).order('created_at'),
    supabase.from('contratos').select('*').eq('cliente_id', clientId),
    supabase
      .from('cliente_eventos')
      .select('*')
      .eq('cliente_id', clientId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    // Solo si no está vinculado: oportunidades abiertas para elegir.
    cliente.ghl_opportunity_id
      ? Promise.resolve([])
      : Promise.all([searchOpportunities({ status: 'open' }), getPipelineStages()])
          .then(([opps, pipeline]) =>
            opps.map((o) => ({
              id: o.id,
              nombre: o.name || getContactoNombre(o.contact),
              etapa: pipeline?.stages.find((s) => s.id === o.pipelineStageId)?.name ?? '—',
            }))
          )
          .catch(() => []),
  ])

  const hoy = hoyISO()
  const servicios = (proyectos ?? []).slice().sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado])
  const deBaja = cliente.estado === 'finalizado'
  const recurrente = recurrenteMensual(servicios)
  const unicos = pagosUnicos(servicios)
  const enMarcha = pagosUnicosEnMarcha(servicios)
  const enCurso = servicios.filter((s) => s.estado === 'en_curso' && esRecurrente(s.cobro)).length

  return (
    <PageContainer>
      <Link
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </Link>
      <PageHeader
        eyebrow="Cliente"
        title={cliente.empresa}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={ESTADOS_CLIENTE[cliente.estado].tone}>{ESTADOS_CLIENTE[cliente.estado].label}</Badge>
            {deBaja ? (
              <BotonAccion
                action={setEstadoCliente.bind(null, cliente.id, 'activo')}
                confirmar={`¿Reactivar a ${cliente.empresa}?`}
                variant="secondary"
              >
                <UserCheck size={14} />
                Reactivar
              </BotonAccion>
            ) : (
              <BotonAccion
                action={setEstadoCliente.bind(null, cliente.id, 'finalizado')}
                confirmar={`¿Dar de baja a ${cliente.empresa}? Seguirá en la lista de clientes "De baja" con todos sus datos, contratos e historial.`}
                variant="secondary"
              >
                <UserX size={14} />
                Dar de baja
              </BotonAccion>
            )}
          </div>
        }
      />

      {/* Resumen: el dinero que entra con este cliente */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumen icon={<Repeat size={14} />} label="Recurrente mensual" valor={`${formatEUR(recurrente)}/mes`} nota={`${enCurso} servicio${enCurso === 1 ? '' : 's'} en curso`} destacado />
        <Resumen icon={<TrendingUp size={14} />} label="Valor anual" valor={formatEUR(recurrente * 12)} nota="Recurrente × 12" />
        <Resumen
          icon={<Receipt size={14} />}
          label="Pagos únicos"
          valor={formatEUR(unicos)}
          nota={enMarcha ? `Entregados · +${formatEUR(enMarcha)} en marcha` : 'Entregados'}
        />
        <Resumen
          icon={<CalendarDays size={14} />}
          label="Antigüedad"
          valor={antiguedad(cliente.fecha_inicio, hoy)}
          nota={`Cliente desde ${formatFecha(cliente.fecha_inicio)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Columna izquierda: contacto, edición e historial */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle icon={<User size={17} />}>Contacto</CardTitle>
            <dl className="space-y-3 text-sm">
              <Dato icon={<Building2 size={16} />} label="Empresa">
                {cliente.empresa}
              </Dato>
              <Dato icon={<User size={16} />} label="Responsable">
                {cliente.responsable ?? '—'}
              </Dato>
              <Dato icon={<Phone size={16} />} label="Teléfono">
                {cliente.telefono ? (
                  <span className="flex flex-wrap items-center gap-3">
                    <a href={`tel:${cliente.telefono}`} className="text-brand-300 hover:underline">
                      {cliente.telefono}
                    </a>
                    <a
                      href={waLink(cliente.telefono)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:underline"
                    >
                      <MessageCircle size={13} />
                      WhatsApp
                    </a>
                  </span>
                ) : (
                  '—'
                )}
              </Dato>
              <Dato icon={<Mail size={16} />} label="Email">
                {cliente.email ? (
                  <a href={`mailto:${cliente.email}`} className="break-all text-brand-300 hover:underline">
                    {cliente.email}
                  </a>
                ) : (
                  '—'
                )}
              </Dato>
            </dl>
            <div className="mt-4 border-t border-hairline/[0.06] pt-4">
              {cliente.ghl_opportunity_id ? (
                <Link
                  href={`/pipeline?ver=todas&lead=${cliente.ghl_opportunity_id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
                >
                  <KanbanSquare size={14} />
                  Vinculado con el pipeline · ver oportunidad
                </Link>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-ink/45">Sin vincular con el pipeline</span>
                  <VincularOportunidad clienteId={cliente.id} oportunidades={oportunidades} />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle icon={<History size={17} />}>Historial</CardTitle>
            <Historial clienteId={cliente.id} eventos={eventos ?? []} />
          </Card>

          <Card>
            <CardTitle icon={<Pencil size={17} />}>Editar cliente</CardTitle>
            <FormCliente cliente={cliente} />
            <div className="mt-5 border-t border-hairline/[0.06] pt-4">
              <BotonAccion
                action={eliminarCliente.bind(null, cliente.id)}
                confirmar={`¿Eliminar a ${cliente.empresa} para siempre? Se borran sus servicios, contratos e historial. Si ya no es cliente, mejor "Dar de baja".`}
                variant="danger"
              >
                <Trash2 size={14} />
                Eliminar cliente
              </BotonAccion>
            </div>
          </Card>
        </div>

        {/* Columna derecha: servicios contratados y contratos */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardTitle
              icon={<FolderKanban size={17} />}
              action={
                <FormDialogo
                  titulo="Nuevo servicio contratado"
                  trigger={<><Plus size={15} />Servicio</>}
                  triggerSize="sm"
                  action={guardarProyecto}
                  submitLabel="Añadir servicio"
                >
                  <CamposServicio clienteId={cliente.id} />
                </FormDialogo>
              }
            >
              Servicios contratados
            </CardTitle>
            {servicios.length === 0 ? (
              <EstadoVacio icon={<FolderKanban size={20} />} titulo="Sin servicios contratados todavía" />
            ) : (
              <ul className="space-y-2">
                {servicios.map((p) => (
                  <li
                    key={p.id}
                    className={clsx(
                      'rounded-xl border border-hairline/[0.06] bg-elevated p-3',
                      p.estado === 'baja' && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{p.nombre}</p>
                        <p className="text-xs text-ink/45">{TIPOS_PROYECTO[p.tipo]}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <Badge tone={estadoServicio(p.estado, p.cobro).tone}>{estadoServicio(p.estado, p.cobro).label}</Badge>
                        {p.importe_cents != null && (
                          <span
                            className={clsx(
                              'tabular text-sm font-bold',
                              p.estado === 'baja' ? 'text-ink/50 line-through' : 'text-ink'
                            )}
                          >
                            {formatEUR(p.importe_cents)}
                            <span className="text-xs font-medium text-ink/45">
                              {p.cobro === 'unico' ? ' · pago único' : TIPOS_COBRO[p.cobro].sufijo}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-ink/45">
                        {estadoServicio(p.estado, p.cobro).desde} {formatFecha(p.estado_desde)}
                        {p.fecha_inicio && p.fecha_inicio !== p.estado_desde && ` · contratado el ${formatFecha(p.fecha_inicio)}`}
                      </p>
                      <div className="flex items-center">
                        <FormDialogo
                          titulo="Cambiar estado"
                          trigger={<ArrowRightLeft size={15} />}
                          triggerVariant="ghost"
                          triggerSize="icon"
                          triggerTitle="Cambiar estado"
                          action={cambiarEstadoServicio}
                          submitLabel="Guardar estado"
                        >
                          <CamposEstadoServicio servicio={p} />
                        </FormDialogo>
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir enlace"
                            aria-label="Abrir enlace"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-hairline/5 hover:text-ink"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <FormDialogo
                          titulo="Editar servicio"
                          trigger={<Pencil size={15} />}
                          triggerVariant="ghost"
                          triggerSize="icon"
                          triggerTitle="Editar"
                          action={guardarProyecto}
                        >
                          <CamposServicio clienteId={cliente.id} proyecto={p} />
                        </FormDialogo>
                        <BotonAccion
                          action={eliminarProyecto.bind(null, p.id)}
                          confirmar={`¿Eliminar "${p.nombre}" del panel? Si el cliente lo ha dejado, mejor "Cambiar estado" → De baja / Cancelado para que quede en el historial.`}
                          size="icon"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </BotonAccion>
                      </div>
                    </div>
                    {p.notas && <p className="mt-2 whitespace-pre-line text-xs text-ink/55">{p.notas}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle icon={<FileSignature size={17} />}>Contratos firmados con {cliente.empresa}</CardTitle>
            <Contratos clienteId={cliente.id} contratos={contratos ?? []} hoy={hoy} />
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

function Resumen({
  icon,
  label,
  valor,
  nota,
  destacado = false,
}: {
  icon: React.ReactNode
  label: string
  valor: string
  nota?: string
  destacado?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border px-4 py-3.5',
        destacado ? 'border-brand-500/30 bg-brand-600/[0.07]' : 'border-hairline/[0.07] bg-card'
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink/50">
        <span className="text-brand-300">{icon}</span>
        {label}
      </p>
      <p className="tabular mt-1.5 text-lg font-bold leading-tight text-ink sm:text-xl">{valor}</p>
      {nota && <p className="mt-0.5 text-[11px] text-ink/40">{nota}</p>}
    </div>
  )
}
