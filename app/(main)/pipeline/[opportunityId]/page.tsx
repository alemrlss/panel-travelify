import Link from 'next/link'
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  Euro,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  ThumbsDown,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getContact, getOpportunity, getPipelineStages } from '@/lib/ghl/client'
import type { GhlContact, GhlOpportunity, GhlPipeline } from '@/lib/ghl/types'
import { createClient } from '@/lib/supabase/server'
import type { OportunidadPerdida } from '@/lib/supabase/types'
import { MOTIVOS_PERDIDA, opciones } from '@/lib/catalogos'
import { formatEUR, formatFecha, getContactoNombre, waLink } from '@/lib/formato'
import { guardarValorOportunidad, marcarPerdida, moveOpportunityStage, reabrirOportunidad } from '@/actions/pipeline'
import { convertirEnCliente } from '@/actions/clientes'
import { FormDialogo } from '@/components/form-dialogo'
import { BotonAccion } from '@/components/boton-accion'
import { CamposCliente } from '@/components/campos'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Aviso, Card, CardTitle } from '@/components/ui/card'
import { Button, buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dato } from '@/components/dato'
import { clsx } from '@/lib/clsx'

const ESTADOS = {
  open: { label: 'Abierta', tone: 'brand' },
  won: { label: 'Ganada', tone: 'success' },
  lost: { label: 'Perdida', tone: 'danger' },
  abandoned: { label: 'Abandonada', tone: 'neutral' },
} as const

export default async function OportunidadPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>
}) {
  await requireUser()
  const { opportunityId } = await params

  let opportunity: GhlOpportunity | undefined
  let contact: GhlContact | undefined
  let pipeline: GhlPipeline | undefined
  let error: string | null = null

  try {
    ;[pipeline, opportunity] = await Promise.all([
      getPipelineStages(),
      getOpportunity(opportunityId),
    ])
    if (opportunity) contact = await getContact(opportunity.contactId)
  } catch (e) {
    error = e instanceof Error ? e.message : 'No se pudo cargar la oportunidad'
  }

  let clienteId: string | null = null
  let perdida: OportunidadPerdida | null = null
  if (opportunity) {
    const supabase = await createClient()
    const [{ data }, { data: motivo }] = await Promise.all([
      supabase.from('clientes').select('id').eq('ghl_contact_id', opportunity.contactId).maybeSingle(),
      supabase.from('oportunidades_perdidas').select('*').eq('ghl_opportunity_id', opportunity.id).maybeSingle(),
    ])
    clienteId = data?.id ?? null
    perdida = motivo
  }

  const nombre = getContactoNombre(contact)

  return (
    <PageContainer>
      <Link
        href="/pipeline"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        Volver al pipeline
      </Link>
      <PageHeader
        eyebrow="Oportunidad"
        title={opportunity?.name || nombre || 'Detalle'}
        action={
          opportunity && <Badge tone={ESTADOS[opportunity.status].tone}>{ESTADOS[opportunity.status].label}</Badge>
        }
      />

      {error && <Aviso>No se pudo cargar la oportunidad: {error}</Aviso>}
      {!error && !opportunity && (
        <Card className="text-sm text-ink/60">Oportunidad no encontrada.</Card>
      )}

      {opportunity && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardTitle icon={<User size={17} />}>Contacto</CardTitle>
            <dl className="space-y-3 text-sm">
              <Dato icon={<User size={16} />} label="Nombre">
                {nombre}
              </Dato>
              <Dato icon={<Building2 size={16} />} label="Empresa">
                {contact?.companyName ?? '—'}
              </Dato>
              <Dato icon={<Phone size={16} />} label="Teléfono">
                {contact?.phone ? (
                  <span className="flex flex-wrap items-center gap-3">
                    <a href={`tel:${contact.phone}`} className="text-brand-300 hover:underline">
                      {contact.phone}
                    </a>
                    <a
                      href={waLink(contact.phone)}
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
                {contact?.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="break-all text-brand-300 hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : (
                  '—'
                )}
              </Dato>
              <Dato icon={<Euro size={16} />} label="Valor">
                <span className="flex items-center gap-2">
                  {opportunity.monetaryValue ? formatEUR(opportunity.monetaryValue * 100) : '—'}
                  <FormDialogo
                    titulo="Valor de la oportunidad"
                    trigger={<Pencil size={14} />}
                    triggerVariant="ghost"
                    triggerSize="icon"
                    triggerTitle="Editar valor"
                    action={guardarValorOportunidad}
                  >
                    <input type="hidden" name="id" value={opportunity.id} />
                    <Campo label="Valor (€)" htmlFor="valor-oportunidad">
                      <Input
                        id="valor-oportunidad"
                        name="valor"
                        inputMode="decimal"
                        placeholder="Ej.: 450"
                        defaultValue={opportunity.monetaryValue ? String(opportunity.monetaryValue).replace('.', ',') : ''}
                      />
                    </Campo>
                    <p className="text-xs text-ink/45">
                      Lo que le has propuesto. Suma en &quot;Valor en pipeline&quot; del Dashboard.
                    </p>
                  </FormDialogo>
                </span>
              </Dato>
            </dl>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardTitle icon={<ArrowLeftRight size={17} />}>Etapa</CardTitle>
              <form
                action={async (formData: FormData) => {
                  'use server'
                  await moveOpportunityStage(opportunity.id, String(formData.get('stageId')))
                }}
              >
                <Select name="stageId" defaultValue={opportunity.pipelineStageId}>
                  {pipeline?.stages
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                </Select>
                <Button type="submit" variant="secondary" className="mt-3 w-full sm:w-auto">
                  <ArrowLeftRight size={16} />
                  Mover etapa
                </Button>
              </form>
            </Card>

            {opportunity.status === 'open' && !clienteId && (
              <Card>
                <CardTitle icon={<ThumbsDown size={17} />}>¿No sale?</CardTitle>
                <p className="mb-4 text-sm text-ink/55">
                  Márcala como perdida y apunta el motivo: en el Dashboard verás por qué se te escapan las
                  ventas.
                </p>
                <FormDialogo
                  titulo="Marcar como perdida"
                  trigger={
                    <>
                      <ThumbsDown size={16} />
                      Marcar como perdida
                    </>
                  }
                  action={marcarPerdida}
                  submitLabel="Marcar como perdida"
                >
                  <CamposPerdida id={opportunity.id} />
                </FormDialogo>
              </Card>
            )}

            {opportunity.status === 'lost' && (
              <Card className="border-red-500/20">
                <CardTitle icon={<ThumbsDown size={17} />}>Perdida</CardTitle>
                {perdida ? (
                  <div className="mb-4 text-sm">
                    <p className="font-semibold text-ink">{MOTIVOS_PERDIDA[perdida.motivo]}</p>
                    <p className="text-xs text-ink/45">
                      {formatFecha(perdida.fecha)}
                      {perdida.etapa && ` · estaba en ${perdida.etapa}`}
                    </p>
                    {perdida.detalle && <p className="mt-2 whitespace-pre-line text-ink/70">{perdida.detalle}</p>}
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-amber-300">
                    Sin motivo apuntado (se marcó fuera del panel). Apúntalo para que quede documentada.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <FormDialogo
                    titulo={perdida ? 'Editar motivo' : 'Apuntar motivo'}
                    trigger={
                      <>
                        <Pencil size={16} />
                        {perdida ? 'Editar motivo' : 'Apuntar motivo'}
                      </>
                    }
                    triggerVariant={perdida ? 'secondary' : 'primary'}
                    action={marcarPerdida}
                    submitLabel="Guardar motivo"
                  >
                    <CamposPerdida id={opportunity.id} perdida={perdida} />
                  </FormDialogo>
                  <BotonAccion action={reabrirOportunidad.bind(null, opportunity.id)} variant="ghost" size="md">
                    <RotateCcw size={16} />
                    Reabrir
                  </BotonAccion>
                </div>
              </Card>
            )}

            <Card className={clsx(!clienteId && 'border-brand-500/30')}>
              <CardTitle icon={clienteId ? <UserCheck size={17} /> : <UserPlus size={17} />}>
                Cliente
              </CardTitle>
              {clienteId ? (
                <>
                  <p className="mb-4 text-sm text-ink/55">Este contacto ya tiene ficha de cliente.</p>
                  <Link
                    href={`/clientes/${clienteId}`}
                    className={clsx(buttonBase, buttonVariants.secondary, buttonSizes.md)}
                  >
                    <UserCheck size={16} />
                    Ver ficha de cliente
                  </Link>
                </>
              ) : (
                <>
                  <p className="mb-4 text-sm text-ink/55">
                    Cuando cierres la venta, conviértelo en cliente: se crea su ficha y la
                    oportunidad queda como <span className="font-semibold text-emerald-300">Ganada</span> en
                    el pipeline.
                  </p>
                  <FormDialogo
                    titulo="Convertir en cliente"
                    trigger={
                      <>
                        <UserPlus size={16} />
                        Convertir en cliente
                      </>
                    }
                    triggerVariant={opportunity.status === 'won' ? 'primary' : 'secondary'}
                    action={convertirEnCliente}
                    submitLabel="Crear cliente y marcar como ganada"
                  >
                    <input type="hidden" name="ghl_contact_id" value={opportunity.contactId} />
                    <input type="hidden" name="ghl_opportunity_id" value={opportunity.id} />
                    <p className="text-sm text-ink/55">
                      Revisa los datos que vienen del lead. Se guardan en la ficha del cliente.
                    </p>
                    <CamposCliente
                      cliente={{
                        empresa: contact?.companyName ?? '',
                        responsable: nombre === '—' ? '' : nombre,
                        telefono: contact?.phone ?? '',
                        email: contact?.email ?? '',
                      }}
                    />
                  </FormDialogo>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

function CamposPerdida({ id, perdida }: { id: string; perdida?: OportunidadPerdida | null }) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <Campo label="Motivo" htmlFor="motivo-perdida">
        <Select id="motivo-perdida" name="motivo" required defaultValue={perdida?.motivo ?? ''}>
          <option value="" disabled>
            Elige el motivo
          </option>
          {opciones(MOTIVOS_PERDIDA).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
