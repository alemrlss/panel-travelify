'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeftRight,
  Building2,
  CalendarPlus,
  Clock,
  ExternalLink,
  Euro,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  Phone,
  RotateCcw,
  Tag,
  ThumbsDown,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { getDetalleLead, type DetalleLead } from '@/actions/leads'
import { guardarValorOportunidad, marcarPerdida, moveOpportunityStage, reabrirOportunidad } from '@/actions/pipeline'
import { convertirEnCliente } from '@/actions/clientes'
import { antiguedad, diasDesde, formatEUR, formatFecha, formatFechaHora, waLink } from '@/lib/formato'
import { MOTIVOS_PERDIDA, opciones } from '@/lib/catalogos'
import { Badge } from '@/components/ui/badge'
import { Button, buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { Dato } from '@/components/dato'
import { CamposCliente } from '@/components/campos'
import { FormDialogo, MensajeError } from '@/components/form-dialogo'
import { NotasLead } from '@/components/pipeline/notas-lead'
import { clsx } from '@/lib/clsx'

const ESTADOS = {
  open: { label: 'Abierta', tone: 'brand' },
  won: { label: 'Ganada', tone: 'success' },
  lost: { label: 'Perdida', tone: 'danger' },
  abandoned: { label: 'Abandonada', tone: 'neutral' },
} as const

/**
 * La ficha del lead: panel que entra desde la derecha al hacer clic en una
 * tarjeta del pipeline (no hay otra pantalla de oportunidad). Datos, etapa,
 * notas internas, valor, perdida con motivo y "Convertir en cliente". Sobre
 * <dialog> nativo, como Dialogo: foco atrapado, Escape y clic fuera cierran.
 */
export function PanelLead({
  opportunityId,
  etapas,
  onCerrar,
  onMovido,
  onCambio,
}: {
  opportunityId: string | null
  etapas: { id: string; nombre: string }[]
  onCerrar: () => void
  onMovido: (oppId: string, toStageId: string) => void
  /** Algo cambió en GHL (status, valor): el tablero se refresca. */
  onCambio: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [detalle, setDetalle] = useState<DetalleLead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [moviendo, startMover] = useTransition()
  const [reabriendo, startReabrir] = useTransition()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (opportunityId && !dialog.open) dialog.showModal()
    if (!opportunityId && dialog.open) dialog.close()
  }, [opportunityId])

  const cargar = useCallback(async (id: string, limpiar: boolean) => {
    if (limpiar) setDetalle(null)
    setError(null)
    const res = await getDetalleLead(id)
    if (res.detalle) setDetalle(res.detalle)
    else setError(res.error ?? 'No se pudo cargar el lead')
  }, [])

  useEffect(() => {
    if (opportunityId) cargar(opportunityId, true)
  }, [opportunityId, cargar])

  // Tras una acción (perdida, valor, reabrir): datos frescos sin vaciar el panel.
  function actualizado() {
    if (opportunityId) cargar(opportunityId, false)
    onCambio()
  }

  function mover(toStageId: string) {
    if (!detalle) return
    const id = detalle.oportunidad.id
    setDetalle({ ...detalle, oportunidad: { ...detalle.oportunidad, etapaId: toStageId, enEtapaDesde: new Date().toISOString() } })
    onMovido(id, toStageId)
    startMover(async () => {
      await moveOpportunityStage(id, toStageId)
    })
  }

  function reabrir() {
    if (!detalle) return
    const id = detalle.oportunidad.id
    startReabrir(async () => {
      await reabrirOportunidad(id)
      actualizado()
    })
  }

  const o = detalle?.oportunidad
  const c = detalle?.contacto
  const estado = o ? ESTADOS[o.status] : null
  const puedeConvertir = !!o && !detalle?.cliente && (o.status === 'open' || o.status === 'won')

  return (
    <dialog
      ref={ref}
      // React propaga el "close" de los diálogos de dentro (valor, motivo…): solo cuenta el propio.
      onClose={(e) => {
        if (e.target === ref.current) onCerrar()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar()
      }}
      aria-label="Ficha del lead"
      className="panel-lateral fixed inset-y-0 left-auto right-0 m-0 h-full max-h-none w-full max-w-md border-l border-hairline/10 bg-card p-0 text-ink shadow-lift backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
    >
      {opportunityId && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-hairline/[0.07] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">Lead</p>
              <h2 className="truncate text-lg font-bold">{o?.nombre ?? 'Cargando…'}</h2>
              {estado && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={estado.tone}>{estado.label}</Badge>
                  {!!o?.valor && (
                    <Badge tone="brand" className="tabular">
                      {formatEUR(o.valor * 100)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-ink/50 hover:bg-hairline/5 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {error && <MensajeError>{error}</MensajeError>}
            {!detalle && !error && (
              <p className="flex items-center justify-center gap-2 py-16 text-sm text-ink/45">
                <Loader2 size={16} className="animate-spin" />
                Cargando lead…
              </p>
            )}

            {detalle && o && c && (
              <>
                {/* Acciones rápidas */}
                <div className="grid grid-cols-3 gap-2">
                  <Accion href={c.telefono ? `tel:${c.telefono}` : undefined} icon={<Phone size={16} />} label="Llamar" />
                  <Accion
                    href={c.telefono ? waLink(c.telefono) : undefined}
                    externo
                    icon={<MessageCircle size={16} />}
                    label="WhatsApp"
                  />
                  <Accion href={c.email ? `mailto:${c.email}` : undefined} icon={<Mail size={16} />} label="Email" />
                </div>

                {/* Etapa */}
                <Seccion icon={<ArrowLeftRight size={15} />} titulo="Etapa">
                  {o.status === 'open' ? (
                    <Select
                      aria-label="Etapa"
                      value={o.etapaId}
                      disabled={moviendo}
                      onChange={(e) => mover(e.target.value)}
                    >
                      {etapas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <p className="text-sm text-ink/80">{etapas.find((s) => s.id === o.etapaId)?.nombre ?? '—'}</p>
                  )}
                  {o.enEtapaDesde && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/45">
                      <Clock size={12} />
                      En esta etapa desde {formatFecha(o.enEtapaDesde.slice(0, 10))}
                      {' · '}
                      {diasEn(o.enEtapaDesde)}
                    </p>
                  )}
                </Seccion>

                {/* Perdida: motivo documentado, editable, y reabrir */}
                {o.status === 'lost' && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm">
                    {detalle.perdida ? (
                      <>
                        <p className="flex items-center gap-1.5 font-semibold text-red-300">
                          <ThumbsDown size={14} />
                          Perdida: {detalle.perdida.motivo}
                        </p>
                        <p className="mt-0.5 text-xs text-ink/45">
                          {formatFecha(detalle.perdida.fecha)}
                          {detalle.perdida.etapa && ` · estaba en ${detalle.perdida.etapa}`}
                        </p>
                        {detalle.perdida.detalle && (
                          <p className="mt-2 whitespace-pre-line text-ink/75">{detalle.perdida.detalle}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-amber-300">
                        Sin motivo apuntado (se marcó fuera del panel). Apúntalo para que quede documentada.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <FormDialogo
                        titulo={detalle.perdida ? 'Editar motivo' : 'Apuntar motivo'}
                        trigger={
                          <>
                            <Pencil size={14} />
                            {detalle.perdida ? 'Editar motivo' : 'Apuntar motivo'}
                          </>
                        }
                        triggerVariant={detalle.perdida ? 'secondary' : 'primary'}
                        triggerSize="sm"
                        action={marcarPerdida}
                        submitLabel="Guardar motivo"
                        onOk={actualizado}
                      >
                        <CamposPerdida id={o.id} perdida={detalle.perdida} />
                      </FormDialogo>
                      <Button type="button" variant="ghost" size="sm" disabled={reabriendo} onClick={reabrir}>
                        {reabriendo ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        Reabrir
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notas internas */}
                <Seccion icon={<MessageSquare size={15} />} titulo="Notas internas">
                  <NotasLead key={c.id} contactId={c.id} opportunityId={o.id} notasIniciales={detalle.notas} />
                </Seccion>

                {/* Datos del lead */}
                <Seccion icon={<User size={15} />} titulo="Datos del lead">
                  <dl className="space-y-3 text-sm">
                    <Dato icon={<User size={15} />} label="Nombre">
                      {c.nombre}
                    </Dato>
                    <Dato icon={<Building2 size={15} />} label="Empresa">
                      {c.empresa ?? '—'}
                    </Dato>
                    <Dato icon={<Phone size={15} />} label="Teléfono">
                      {c.telefono ?? '—'}
                    </Dato>
                    <Dato icon={<Mail size={15} />} label="Email">
                      <span className="break-all">{c.email ?? '—'}</span>
                    </Dato>
                    <Dato icon={<Euro size={15} />} label="Valor">
                      <span className="flex items-center gap-1">
                        {o.valor ? formatEUR(o.valor * 100) : '—'}
                        <FormDialogo
                          titulo="Valor de la oportunidad"
                          trigger={<Pencil size={13} />}
                          triggerVariant="ghost"
                          triggerSize="icon"
                          triggerTitle="Editar valor"
                          action={guardarValorOportunidad}
                          onOk={actualizado}
                        >
                          <input type="hidden" name="id" value={o.id} />
                          <Campo label="Valor (€)" htmlFor="valor-oportunidad">
                            <Input
                              id="valor-oportunidad"
                              name="valor"
                              inputMode="decimal"
                              placeholder="Ej.: 450"
                              defaultValue={o.valor ? String(o.valor).replace('.', ',') : ''}
                            />
                          </Campo>
                          <p className="text-xs text-ink/45">
                            Lo que le has propuesto. Suma en &quot;Valor en pipeline&quot; del Dashboard.
                          </p>
                        </FormDialogo>
                      </span>
                    </Dato>
                    <Dato icon={<CalendarPlus size={15} />} label="Entró">
                      {formatFechaHora(o.creada)}
                      {c.fuente && <span className="text-ink/45"> · {c.fuente}</span>}
                    </Dato>
                    {c.etiquetas.length > 0 && (
                      <Dato icon={<Tag size={15} />} label="Etiquetas">
                        <span className="flex flex-wrap gap-1">
                          {c.etiquetas.map((t) => (
                            <Badge key={t}>{t}</Badge>
                          ))}
                        </span>
                      </Dato>
                    )}
                  </dl>
                </Seccion>

                {/* Cliente */}
                {detalle.cliente && (
                  <Seccion icon={<UserCheck size={15} />} titulo="Cliente">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{detalle.cliente.empresa}</p>
                        <Badge tone={detalle.cliente.estado === 'Activo' ? 'success' : 'neutral'}>
                          {detalle.cliente.estado}
                        </Badge>
                      </div>
                      {detalle.cliente.responsable && (
                        <p className="mt-0.5 text-xs text-ink/55">{detalle.cliente.responsable}</p>
                      )}
                      <p className="tabular mt-1 text-xs text-ink/55">
                        {formatEUR(detalle.cliente.recurrenteCents)}/mes · {detalle.cliente.servicios}{' '}
                        {detalle.cliente.servicios === 1 ? 'servicio' : 'servicios'} · cliente desde hace{' '}
                        {antiguedad(detalle.cliente.desde)}
                      </p>
                    </div>
                  </Seccion>
                )}
              </>
            )}
          </div>

          {/* Acciones principales, siempre a mano */}
          {detalle && o && c && (detalle.cliente || puedeConvertir) && (
            <div className="flex gap-2 border-t border-hairline/[0.07] px-5 py-3 [&>*]:flex-1">
              {detalle.cliente ? (
                <Link
                  href={`/clientes/${detalle.cliente.id}`}
                  className={clsx(buttonBase, buttonVariants.secondary, buttonSizes.md, 'justify-center')}
                >
                  <ExternalLink size={15} />
                  Ver ficha del cliente
                </Link>
              ) : (
                <>
                  {o.status === 'open' && (
                    <FormDialogo
                      titulo="Marcar como perdida"
                      trigger={
                        <>
                          <ThumbsDown size={15} />
                          Perdida
                        </>
                      }
                      action={marcarPerdida}
                      submitLabel="Marcar como perdida"
                      onOk={actualizado}
                    >
                      <CamposPerdida id={o.id} />
                    </FormDialogo>
                  )}
                  <FormDialogo
                    titulo="Convertir en cliente"
                    trigger={
                      <>
                        <UserPlus size={15} />
                        Convertir en cliente
                      </>
                    }
                    triggerVariant="primary"
                    action={convertirEnCliente}
                    submitLabel="Crear cliente y marcar como ganada"
                  >
                    <input type="hidden" name="ghl_contact_id" value={c.id} />
                    <input type="hidden" name="ghl_opportunity_id" value={o.id} />
                    <p className="text-sm text-ink/55">
                      Revisa los datos que vienen del lead. Se guardan en la ficha del cliente y la oportunidad
                      queda como <span className="font-semibold text-emerald-300">Ganada</span>.
                    </p>
                    <CamposCliente
                      cliente={{
                        empresa: c.empresa ?? '',
                        responsable: c.nombre === '—' ? '' : c.nombre,
                        telefono: c.telefono ?? '',
                        email: c.email ?? '',
                      }}
                    />
                  </FormDialogo>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

function CamposPerdida({ id, perdida }: { id: string; perdida?: DetalleLead['perdida'] }) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <Campo label="Motivo" htmlFor="motivo-perdida">
        <Select id="motivo-perdida" name="motivo" required defaultValue={perdida?.codigo ?? ''}>
          <option value="" disabled>
            Elige el motivo
          </option>
          {opciones(MOTIVOS_PERDIDA).map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Campo>
      <Campo label="Detalle (opcional)" htmlFor="detalle-perdida">
        <Textarea
          id="detalle-perdida"
          name="detalle"
          defaultValue={perdida?.detalle ?? ''}
          placeholder="Qué te dijo, qué le pareció caro, cuándo volver a intentarlo…"
        />
      </Campo>
    </>
  )
}

function diasEn(iso: string) {
  const d = diasDesde(iso.slice(0, 10))
  return d <= 0 ? 'hoy' : d === 1 ? '1 día' : `${d} días`
}

function Seccion({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/50">
        <span className="text-brand-300">{icon}</span>
        {titulo}
      </h3>
      {children}
    </section>
  )
}

function Accion({
  href,
  icon,
  label,
  externo,
}: {
  href?: string
  icon: React.ReactNode
  label: string
  externo?: boolean
}) {
  const clase =
    'flex flex-col items-center gap-1 rounded-xl border border-hairline/[0.08] bg-elevated px-2 py-2.5 text-xs font-semibold'
  if (!href)
    return (
      <span
        className={clsx(clase, 'cursor-not-allowed text-ink/25')}
        aria-disabled="true"
        title={label === 'Email' ? 'Sin email' : 'Sin teléfono'}
      >
        {icon}
        {label}
      </span>
    )
  return (
    <a
      href={href}
      target={externo ? '_blank' : undefined}
      rel={externo ? 'noreferrer' : undefined}
      className={clsx(clase, 'text-ink/75 transition-colors hover:border-brand-500/50 hover:text-ink')}
    >
      {icon}
      {label}
    </a>
  )
}
