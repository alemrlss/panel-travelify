import Link from 'next/link'
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  Euro,
  Mail,
  MessageCircle,
  Phone,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getContact, getOpportunity, getPipelineStages } from '@/lib/ghl/client'
import type { GhlContact, GhlOpportunity, GhlPipeline } from '@/lib/ghl/types'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, getContactoNombre, waLink } from '@/lib/formato'
import { moveOpportunityStage } from '@/actions/pipeline'
import { crearCliente } from '@/actions/clientes'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Aviso, Card, CardTitle } from '@/components/ui/card'
import { Button, buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
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
  if (opportunity) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('clientes')
      .select('id')
      .eq('ghl_contact_id', opportunity.contactId)
      .maybeSingle()
    clienteId = data?.id ?? null
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
                {opportunity.monetaryValue ? formatEUR(opportunity.monetaryValue * 100) : '—'}
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
                    {opportunity.status === 'won'
                      ? '¡Oportunidad ganada! Crea su ficha para registrar proyectos y cobros.'
                      : 'Cuando cierres la venta, convierte este contacto en cliente.'}
                  </p>
                  <form
                    action={async () => {
                      'use server'
                      await crearCliente({
                        ghlContactId: opportunity.contactId,
                        ghlOpportunityId: opportunity.id,
                        nombre: contact?.companyName || nombre,
                      })
                    }}
                  >
                    <Button
                      type="submit"
                      variant={opportunity.status === 'won' ? 'primary' : 'secondary'}
                    >
                      <UserPlus size={16} />
                      Convertir en cliente
                    </Button>
                  </form>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
