import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { clsx } from '@/lib/clsx'

// text-base en móvil: por debajo de 16px iOS hace zoom al enfocar el campo
export const campoBase =
  'w-full rounded-lg border border-hairline/10 bg-elevated px-3.5 py-3 text-base text-ink outline-none transition-all placeholder:text-ink/30 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 sm:py-2.5 sm:text-sm'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={clsx(campoBase, className)} {...props} />
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={clsx(campoBase, 'pr-8', className)} {...props} />
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={clsx(campoBase, 'min-h-[88px] resize-y', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export function Campo({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink/70">
        {label}
      </label>
      {children}
    </div>
  )
}
