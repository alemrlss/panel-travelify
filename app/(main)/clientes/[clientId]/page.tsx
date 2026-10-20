import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FolderKanban,
  Mail,
  MessageCircle,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getContact } from '@/lib/ghl/client'
import { esRecurrenteVigente, esVencido } from '@/lib/metricas'
import { formatEUR, formatFecha, getContactoNombre, waLink } from '@/lib/formato'
import { ESTADOS_CLIENTE, ESTADOS_PROYECTO, TIPOS_COBRO, TIPOS_PROYECTO } from '@/lib/catalogos'
import { eliminarCliente } from '@/actions/clientes'
import { eliminarProyecto, guardarProyecto } from '@/actions/proyectos'
import {
  eliminarServicio,
  guardarServicio,
  registrarPago,
  setServicioActivo,
} from '@/actions/facturacion'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EstadoVacio } from '@/components/ui/estado-vacio'
import { Dato } from '@/components/dato'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { CamposPago, CamposProyecto, CamposServicio } from '@/components/campos'
import { FormCliente } from '@/components/clientes/form-cliente'
import { ListaPagos } from '@/components/facturacion/lista-pagos'
import { clsx } from '@/lib/clsx'

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

  const [{ data: proyectos }, { data: servicios }, { data: pagos }, contacto] = await Promise.all([
    supabase.from('proyectos').select('*').eq('cliente_id', clientId).order('created_at'),
    supabase.from('servicios_contratados').select('*').eq('cliente_id', clientId).order('created_at'),
    supabase
      .from('pagos')
      .select('*')
      .eq('cliente_id', clientId)
      .order('fecha_vencimiento', { ascending: false }),
    getContact(cliente.ghl_contact_id).catch(() => null),
  ])

  const mrr = (servicios ?? []).filter((s) => esRecurrenteVigente(s)).reduce((t, s) => t + s.importe_cents, 0)
  const pendientes = (pagos ?? []).filter((p) => p.estado === 'pendiente')
  const cobrado = (pagos ?? []).filter((p) => p.estado === 'pagado').reduce((t, p) => t + p.importe_cents, 0)
  const nombresProyecto = new Map(proyectos?.map((p) => [p.id, p.nombre]))

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
        title={cliente.nombre_cache}
        action={<Badge tone={ESTADOS_CLIENTE[cliente.estado].tone}>{ESTADOS_CLIENTE[cliente.estado].label}</Badge>}
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Resumen icon={<Repeat size={14} />} label="Mensual" valor={formatEUR(mrr)} />
        <Resumen
          icon={<Wallet size={14} />}
          label="Pendiente"
          valor={formatEUR(pendientes.reduce((t, p) => t + p.importe_cents, 0))}
          alerta={pendientes.some((p) => esVencido(p))}
        />
        <Resumen icon={<Receipt size={14} />} label="Cobrado total" valor={formatEUR(cobrado)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Columna izquierda: contacto + datos */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardTitle icon={<User size={17} />}>Contacto</CardTitle>
            {contacto ? (
              <dl className="space-y-3 text-sm">
                <Dato icon={<User size={16} />} label="Nombre">
                  {getContactoNombre(contacto)}
                </Dato>
                {contacto.companyName && (
                  <Dato icon={<Building2 size={16} />} label="Empresa">
                    {contacto.companyName}
                  </Dato>
                )}
                <Dato icon={<Phone size={16} />} label="Teléfono">
                  {contacto.phone ? (
                    <span className="flex flex-wrap items-center gap-3">
                      <a href={`tel:${contacto.phone}`} className="text-brand-300 hover:underline">
                        {contacto.phone}
                      </a>
                      <a
                        href={waLink(contacto.phone)}
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
                  {contacto.email ? (
                    <a href={`mailto:${contacto.email}`} className="break-all text-brand-300 hover:underline">
                      {contacto.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </Dato>
              </dl>
            ) : (
              <p className="text-sm text-amber-200">
                No se pudieron leer los datos de contacto en este momento.
              </p>
            )}
          </Card>

          <Card>
            <CardTitle icon={<Pencil size={17} />}>Datos del cliente</CardTitle>
            <FormCliente cliente={cliente} />
            <div className="mt-5 border-t border-hairline/[0.06] pt-4">
              <BotonAccion
                action={eliminarCliente.bind(null, cliente.id)}
                confirmar={`¿Eliminar a ${cliente.nombre_cache}? Se borran también sus proyectos, servicios y pagos. El contacto en tu CRM no se toca.`}
                variant="danger"
              >
                <Trash2 size={14} />
                Eliminar cliente
              </BotonAccion>
            </div>
          </Card>
        </div>

        {/* Columna derecha: proyectos, servicios, pagos */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardTitle
              icon={<FolderKanban size={17} />}
              action={
                <FormDialogo
                  titulo="Nuevo proyecto"
                  trigger={<><Plus size={15} />Proyecto</>}
                  triggerSize="sm"
                  action={guardarProyecto}
                  submitLabel="Crear proyecto"
                >
                  <CamposProyecto clienteId={cliente.id} />
                </FormDialogo>
              }
            >
              Proyectos
            </CardTitle>
            {!proyectos?.length ? (
              <EstadoVacio icon={<FolderKanban size={20} />} titulo="Sin proyectos todavía" />
            ) : (
              <ul className="space-y-2">
                {proyectos.map((p) => (
                  <li key={p.id} className="rounded-xl border border-hairline/[0.06] bg-elevated p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{p.nombre}</p>
                        <p className="text-xs text-ink/45">{TIPOS_PROYECTO[p.tipo]}</p>
                      </div>
                      <Badge tone={ESTADOS_PROYECTO[p.estado].tone}>{ESTADOS_PROYECTO[p.estado].label}</Badge>
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
                          titulo="Editar proyecto"
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
                          confirmar={`¿Eliminar el proyecto "${p.nombre}"?`}
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
            <CardTitle
              icon={<Repeat size={17} />}
              action={
                <FormDialogo
                  titulo="Nuevo servicio contratado"
                  trigger={<><Plus size={15} />Servicio</>}
                  triggerSize="sm"
                  action={guardarServicio}
                  submitLabel="Crear servicio"
                >
                  <CamposServicio clienteId={cliente.id} proyectos={proyectos ?? []} />
                </FormDialogo>
              }
            >
              Lo que cobra
            </CardTitle>
            {!servicios?.length ? (
              <EstadoVacio
                icon={<Repeat size={20} />}
                titulo="Sin servicios contratados"
                texto="Añade lo que te paga este cliente: una cuota mensual o un pago único."
              />
            ) : (
              <ul className="divide-y divide-hairline/[0.06]">
                {servicios.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className={clsx('min-w-0', !s.activo && 'opacity-50')}>
                      <p className="truncate text-sm font-semibold text-ink">{s.concepto}</p>
                      <p className="text-xs text-ink/45">
                        {TIPOS_COBRO[s.tipo_cobro]}
                        {s.tipo_cobro === 'recurrente_mensual' && ` · día ${s.dia_cobro}`}
                        {` · desde ${formatFecha(s.fecha_inicio)}`}
                        {s.fecha_fin && ` hasta ${formatFecha(s.fecha_fin)}`}
                        {s.proyecto_id && nombresProyecto.get(s.proyecto_id) && ` · ${nombresProyecto.get(s.proyecto_id)}`}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center justify-between gap-2 sm:justify-end">
                      <span className="flex items-center gap-2">
                        <span className="tabular text-sm font-bold text-ink">
                          {formatEUR(s.importe_cents)}
                          {s.tipo_cobro === 'recurrente_mensual' && <span className="text-xs font-medium text-ink/45">/mes</span>}
                        </span>
                        {!s.activo && <Badge>Inactivo</Badge>}
                      </span>
                      <span className="flex items-center">
                        <BotonAccion
                          action={setServicioActivo.bind(null, s.id, !s.activo)}
                          size="icon"
                          title={s.activo ? 'Desactivar' : 'Activar'}
                        >
                          {s.activo ? <Pause size={15} /> : <Play size={15} />}
                        </BotonAccion>
                        <FormDialogo
                          titulo="Editar servicio"
                          trigger={<Pencil size={15} />}
                          triggerVariant="ghost"
                          triggerSize="icon"
                          triggerTitle="Editar"
                          action={guardarServicio}
                        >
                          <CamposServicio clienteId={cliente.id} proyectos={proyectos ?? []} servicio={s} />
                        </FormDialogo>
                        <BotonAccion
                          action={eliminarServicio.bind(null, s.id)}
                          confirmar={`¿Eliminar "${s.concepto}"? Los cobros ya generados se conservan.`}
                          size="icon"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </BotonAccion>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle
              icon={<Wallet size={17} />}
              action={
                <FormDialogo
                  titulo="Registrar cobro"
                  trigger={<><Plus size={15} />Cobro</>}
                  triggerSize="sm"
                  action={registrarPago}
                  submitLabel="Registrar"
                >
                  <CamposPago clientes={[]} clienteId={cliente.id} />
                </FormDialogo>
              }
            >
              Cobros
            </CardTitle>
            {!pagos?.length ? (
              <EstadoVacio icon={<Wallet size={20} />} titulo="Sin cobros registrados" />
            ) : (
              <ListaPagos pagos={pagos} />
            )}
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
  alerta = false,
}: {
  icon: React.ReactNode
  label: string
  valor: string
  alerta?: boolean
}) {
  return (
    <div className={clsx('rounded-2xl border bg-card px-3 py-3 sm:px-4', alerta ? 'border-red-500/30' : 'border-hairline/[0.07]')}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink/45">
        <span className={alerta ? 'text-red-300' : 'text-brand-300'}>{icon}</span>
        {label}
      </p>
      <p className={clsx('tabular mt-1 text-base font-bold sm:text-xl', alerta ? 'text-red-300' : 'text-ink')}>{valor}</p>
    </div>
  )
}
