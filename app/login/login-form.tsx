'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { login } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm({ error }: { error?: string }) {
  const [isPending, startTransition] = useTransition()
  const [verPassword, setVerPassword] = useState(false)

  return (
    <form action={(formData) => startTransition(() => login(formData))} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-ink/80">
          Email
        </label>
        <div className="relative">
          <Mail
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35"
          />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-ink/80">
          Contraseña
        </label>
        <div className="relative">
          <Lock
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35"
          />
          <Input
            id="password"
            name="password"
            type={verPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-10 pr-12"
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink/35 transition-colors hover:text-ink"
          >
            {verPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          <AlertCircle size={17} className="mt-px flex-shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" className="h-12 w-full text-[15px]" disabled={isPending}>
        {isPending ? 'Entrando…' : 'Entrar'}
        {!isPending && <ArrowRight size={18} />}
      </Button>
    </form>
  )
}
