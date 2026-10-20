import type { HTMLAttributes } from 'react'
import { clsx } from '@/lib/clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-hairline/[0.07] bg-card p-5 shadow-soft transition-shadow sm:p-6',
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({
  icon,
  children,
  action,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-base font-bold text-ink">
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
            {icon}
          </span>
        )}
        {children}
      </h2>
      {action}
    </div>
  )
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-amber-400/20 bg-amber-400/[0.06] text-sm text-amber-200">
      {children}
    </Card>
  )
}
