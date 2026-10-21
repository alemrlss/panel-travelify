import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileSignature,
  FolderKanban,
  KanbanSquare,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Repeat,
  Trash2,
  User,
  UserCheck,
  UserX,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatFecha, waLink } from '@/lib/formato'
import { ESTADOS_CLIENTE, ESTADOS_PROYECTO, TIPOS_COBRO, TIPOS_PROYECTO } from '@/lib/catalogos'
import { recurrenteMensual } from '@/lib/servicios'
import { eliminarCliente, setEstadoCliente } from '@/actions/clientes'
import { eliminarProyecto, guardarProyecto } from '@/actions/proyectos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { Dato } from '@/components/dato'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { CamposProyecto } from '@/components/campos'
import { FormCliente } from '@/components/clientes/form-cliente'
import { Contratos } from '@/components/clientes/contratos'

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

  const [{ data: proyectos }, { data: contratos }] = await Promise.all([
    supabase.from('proyectos').select('*').eq('cliente_id', clientId).order('created_at'),
    supabase
      .from('contratos')
      .select('*')
      .eq('cliente_id', clientId)
      .order('created_at', { ascending: false }),
  ])
  const deBaja = cliente.estado === 'finalizado'
  const recurrente = recurrenteMensual(proyectos ?? [])

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
                confirmar={`¿Dar de baja a ${cliente.empresa}? Seguirá en la lista de clientes "De baja" con todos sus datos y contratos.`}
                variant="secondary"
              >
                <UserX size={14} />
                Dar de baja
              </BotonAccion>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Columna izquierda: contacto + edición */}
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
            {cliente.ghl_opportunity_id && (
              <Link
                href={`/pipeline/${cliente.ghl_opportunity_id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                <KanbanSquare size={14} />
                Viene del pipeline · ver oportunidad
              </Link>
            )}
          </Card>

          <Card>
            <CardTitle icon={<Pencil size={17} />}>Editar cliente</CardTitle>
            <FormCliente cliente={cliente} />
            <div className="mt-5 border-t border-hairline/[0.06] pt-4">
              <BotonAccion
                action={eliminarCliente.bind(null, cliente.id)}
                confirmar={`¿Eliminar a ${cliente.empresa}? Se borran también sus servicios contratados y sus contratos. La oportunidad en el pipeline no se toca.`}
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
            <CardTitle icon={<FileSignature size={17} />}>Contratos firmados con {cliente.empresa}</CardTitle>
            <Contratos clienteId={cliente.id} contratos={contratos ?? []} />
          </Card>

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
                  <CamposProyecto clienteId={cliente.id} />
                </FormDialogo>
              }
            >
              Servicios contratados
            </CardTitle>
            {!proyectos?.length ? (
              <EstadoVacio icon={<FolderKanban size={20} />} titulo="Sin servicios contratados todavía" />
            ) : (
              <>
              {recurrente > 0 && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-brand-500/25 bg-brand-600/[0.07] px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-ink/70">
                    <Repeat size={15} className="text-brand-300" />
                    Recurrente mensual
                  </span>
                  <span className="tabular text-base font-bold text-ink">{formatEUR(recurrente)}/mes</span>
                </div>
              )}
              <ul className="space-y-2">
                {proyectos.map((p) => (
                  <li key={p.id} className="rounded-xl border border-hairline/[0.06] bg-elevated p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{p.nombre}</p>
                        <p className="text-xs text-ink/45">{TIPOS_PROYECTO[p.tipo]}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <Badge tone={ESTADOS_PROYECTO[p.estado].tone}>{ESTADOS_PROYECTO[p.estado].label}</Badge>
                        {p.importe_cents != null && (
                          <span className="tabular text-sm font-bold text-ink">
                            {formatEUR(p.importe_cents)}
                            <span className="text-xs font-medium text-ink/45">
                              {p.cobro === 'unico' ? ' · pago único' : TIPOS_COBRO[p.cobro].sufijo}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-ink/40">
                        {p.fecha_inicio ? `Inicio ${formatFecha(p.fecha_inicio)}` : 'Sin fecha de inicio'}
                        {p.fecha_entrega && ` · Entrega ${formatFecha(p.fecha_entrega)}`}
                      </p>
                      <div className="flex items-center">
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
                          <CamposProyecto clienteId={cliente.id} proyecto={p} />
                        </FormDialogo>
                        <BotonAccion
                          action={eliminarProyecto.bind(null, p.id)}
                          confirmar={`¿Eliminar el servicio "${p.nombre}"?`}
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
              </>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
