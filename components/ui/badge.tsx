import type { HTMLAttributes } from 'react'
import { clsx } from '@/lib/clsx'

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-hairline/[0.06] text-ink/60',
  brand: 'bg-brand-500/15 text-brand-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-400/15 text-amber-300',
  danger: 'bg-red-500/15 text-red-300',
  info: 'bg-sky-500/15 text-sky-300',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
