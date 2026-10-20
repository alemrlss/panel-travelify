import { ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/brand'
import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-surface px-4 py-10">
      {/* Glow violeta radial, mismo recurso que el hero de la web personal */}
      <div className="pointer-events-none absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-30%] right-[-10%] h-[380px] w-[380px] rounded-full bg-brand-800/30 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="h-16" priority />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300/80">
            CRM personal
          </p>
        </div>

        <div className="rounded-2xl border border-hairline/[0.08] bg-card/80 p-6 shadow-soft backdrop-blur sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Hola de nuevo</h1>
          <p className="mt-1.5 text-sm text-ink/50">
            Entra para ver tu pipeline, clientes y cobros.
          </p>
          <div className="mb-7 mt-5 h-[3px] w-10 rounded-full bg-brand-500" />

          <LoginForm error={error} />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink/35">
          <ShieldCheck size={14} className="text-brand-400/60" />
          Acceso privado
        </p>
      </div>
    </main>
  )
}
