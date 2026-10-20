import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { clsx } from '@/lib/clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon'

export const buttonVariants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-glow hover:bg-brand-500',
  secondary:
    'border border-hairline/10 bg-elevated text-ink/85 hover:border-brand-500/50 hover:text-ink',
  ghost: 'bg-transparent text-ink/70 hover:bg-hairline/5 hover:text-ink',
  danger: 'bg-red-500/15 text-red-300 hover:bg-red-500/25',
}

export const buttonSizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  icon: 'h-9 w-9 p-0',
}

export const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ className, variant = 'primary', size = 'md', ...props }, ref) => (
  <button
    ref={ref}
    className={clsx(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
    {...props}
  />
))
Button.displayName = 'Button'
