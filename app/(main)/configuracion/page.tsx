import { CheckCircle2, KeyRound, Plug, User, XCircle } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getPipelineStages } from '@/lib/ghl/client'
import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Dato } from '@/components/dato'
import { FormPassword } from '@/components/form-password'
import { getIniciales } from '@/lib/iniciales'

export default async function ConfiguracionPage() {
  const user = await requireUser()

  const [pipeline, db] = await Promise.all([
    getPipelineStages()
      .then((p) => ({ ok: true as const, detalle: p ? `${p.name} · ${p.stages.length} etapas` : 'Sin pipeline' }))
      .catch((e: unknown) => ({ ok: false as const, detalle: e instanceof Error ? e.message : 'Error' })),
    createClient()
      .then((s) => s.from('clientes').select('id', { count: 'exact', head: true }))
      .then(({ count, error }) =>
        error
          ? { ok: false as const, detalle: error.message }
          : { ok: true as const, detalle: `${count ?? 0} clientes guardados` }
      ),
  ])

  return (
    <PageContainer>
      <PageHeader eyebrow="Sistema" title="Ajustes" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle icon={<User size={17} />}>Tu cuenta</CardTitle>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {getIniciales(user.full_name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{user.full_name}</p>
              <p className="truncate text-sm text-ink/50">{user.email}</p>
            </div>
          </div>
          <div className="border-t border-hairline/[0.06] pt-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink/80">
              <KeyRound size={15} className="text-brand-300" />
              Cambiar contraseña
            </p>
            <FormPassword />
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Plug size={17} />}>Conexiones</CardTitle>
          <dl className="space-y-4 text-sm">
            <Dato icon={<Estado ok={pipeline.ok} />} label="Pipeline (GoHighLevel)">
              <span className={pipeline.ok ? '' : 'text-red-300'}>{pipeline.detalle}</span>
            </Dato>
            <Dato icon={<Estado ok={db.ok} />} label="Base de datos (Supabase)">
              <span className={db.ok ? '' : 'text-red-300'}>{db.detalle}</span>
            </Dato>
          </dl>
          <p className="mt-5 text-xs text-ink/40">
            Las credenciales viven en las variables de entorno del servidor, nunca en el código.
          </p>
        </Card>
      </div>
    </PageContainer>
  )
}

function Estado({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 size={16} className="text-emerald-300" />
  ) : (
    <XCircle size={16} className="text-red-300" />
  )
}
