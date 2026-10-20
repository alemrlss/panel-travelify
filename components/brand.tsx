import Image from 'next/image'
import { clsx } from '@/lib/clsx'

// Logo "AM." de la web personal (salidas/web-alejandro-morales/public/logo.png),
// blanco con el punto violeta — pensado para fondo oscuro. 500×500.
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Alejandro Morales"
      width={500}
      height={500}
      priority={priority}
      className={clsx('w-auto select-none', className)}
    />
  )
}

export function Marca({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo className={compact ? 'h-8' : 'h-10'} priority />
      <div className="leading-tight">
        <p className={clsx('font-bold text-ink', compact ? 'text-[13px]' : 'text-sm')}>
          Alejandro Morales
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300/80">
          CRM
        </p>
      </div>
    </div>
  )
}
