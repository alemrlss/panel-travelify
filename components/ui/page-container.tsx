import { clsx } from '@/lib/clsx'

/** `ancho`: para el kanban, que necesita más que el max-w-6xl del resto. */
export function PageContainer({
  children,
  ancho = false,
}: {
  children: React.ReactNode
  ancho?: boolean
}) {
  return (
    <div
      className={clsx(
        'mx-auto px-4 py-6 sm:px-6 sm:py-8',
        ancho ? 'max-w-[1600px]' : 'max-w-6xl'
      )}
    >
      {children}
    </div>
  )
}
