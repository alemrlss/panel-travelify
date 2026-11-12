import Link from 'next/link'
import { KanbanSquare, Repeat } from 'lucide-react'
import { clsx } from '@/lib/clsx'

const PESTANAS = [
  { id: 'tablero', href: '/tareas', label: 'Tablero', icon: KanbanSquare },
  { id: 'recurrentes', href: '/tareas/recurrentes', label: 'Recurrentes', icon: Repeat },
] as const

export function PestanasTareas({ activa }: { activa: (typeof PESTANAS)[number]['id'] }) {
  return (
    <nav aria-label="Secciones de tareas" className="mb-4 flex gap-2">
      {PESTANAS.map((p) => {
        const Icon = p.icon
        return (
          <Link
            key={p.id}
            href={p.href}
            aria-current={p.id === activa ? 'page' : undefined}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
              p.id === activa
                ? 'border-brand-500 bg-brand-600 text-white'
                : 'border-hairline/10 bg-card text-ink/55 hover:text-ink'
            )}
          >
            <Icon size={14} />
            {p.label}
          </Link>
        )
      })}
    </nav>
  )
}
