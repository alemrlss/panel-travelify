'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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
  Phone,
  Tag,
  ThumbsDown,
  User,
  UserCheck,
  X,
} from 'lucide-react'
import { getDetalleLead, type DetalleLead } from '@/actions/leads'
import { moveOpportunityStage } from '@/actions/pipeline'
import { antiguedad, diasDesde, formatEUR, formatFecha, formatFechaHora, waLink } from '@/lib/formato'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { Dato } from '@/components/dato'
import { MensajeError } from '@/components/form-dialogo'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { NotasLead } from '@/components/pipeline/notas-lead'
import { clsx } from '@/lib/clsx'

const ESTADOS = {
  open: { label: 'Abierta', tone: 'brand' },
  won: { label: 'Ganada', tone: 'success' },
  lost: { label: 'Perdida', tone: 'danger' },
  abandoned: { label: 'Abandonada', tone: 'neutral' },
} as const

/**
 * Panel que entra desde la derecha al hacer clic en un lead del pipeline: datos
 * del lead, su etapa, el cliente (si ya lo es) y las notas internas. Sobre
 * <dialog> nativo, como Dialogo: foco atrapado, Escape y clic fuera cierran.
 */
export function PanelLead({
  opportunityId,
  etapas,
  onCerrar,
  onMovido,
}: {
  opportunityId: string | null
  etapas: { id: string; nombre: string }[]
  onCerrar: () => void
  onMovido: (oppId: string, toStageId: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [detalle, setDetalle] = useState<DetalleLead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [moviendo, startMover] = useTransition()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (opportunityId && !dialog.open) dialog.showModal()
    if (!opportunityId && dialog.open) dialog.close()
  }, [opportunityId])

  useEffect(() => {
    if (!opportunityId) return
    let vigente = true
    setDetalle(null)
    setError(null)
    getDetalleLead(opportunityId).then((res) => {
      if (!vigente) return
      if (res.detalle) setDetalle(res.detalle)
      else setError(res.error ?? 'No se pudo cargar el lead')
    })
    return () => {
      vigente = false
    }
  }, [opportunityId])

  function mover(toStageId: string) {
    if (!detalle) return
    const id = detalle.oportunidad.id
    setDetalle({ ...detalle, oportunidad: { ...detalle.oportunidad, etapaId: toStageId, enEtapaDesde: new Date().toISOString() } })
    onMovido(id, toStageId)
    startMover(async () => {
      await moveOpportunityStage(id, toStageId)
    })
  }

  const o = detalle?.oportunidad
  const c = detalle?.contacto
  const estado = o ? ESTADOS[o.status] : null

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar()
      }}
      aria-label="Detalle del lead"
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

                {/* Notas internas */}
                <Seccion icon={<MessageSquare size={15} />} titulo="Notas internas">
                  <NotasLead key={c.id} contactId={c.id} opportunityId={o.id} notasIniciales={detalle.notas} />
                </Seccion>

                {detalle.perdida && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm">
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
                  </div>
                )}

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
                      {o.valor ? formatEUR(o.valor * 100) : '—'}
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
                      <Link
                        href={`/clientes/${detalle.cliente.id}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:underline"
                      >
                        Ver ficha del cliente
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </Seccion>
                )}

              </>
            )}
          </div>

          <div className="border-t border-hairline/[0.07] px-5 py-3">
            <Link
              href={`/pipeline/${opportunityId}`}
              className={clsx(buttonBase, buttonVariants.secondary, buttonSizes.md, 'w-full justify-center')}
            >
              <ExternalLink size={15} />
              Abrir ficha completa
            </Link>
          </div>
        </div>
      )}
    </dialog>
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
      <span className={clsx(clase, 'cursor-not-allowed text-ink/25')} aria-disabled="true" title={`Sin ${label.toLowerCase() === 'email' ? 'email' : 'teléfono'}`}>
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
