'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logout } from '@/actions/auth'
import { clsx } from '@/lib/clsx'
import { NAV_ITEMS } from '@/lib/nav-items'
import { getIniciales } from '@/lib/iniciales'
import { Marca } from '@/components/brand'

export function Sidebar({ fullName, email }: { fullName: string; email: string }) {
  const pathname = usePathname()

  return (
    <aside className="relative hidden h-screen w-64 flex-shrink-0 flex-col overflow-hidden border-r border-hairline/[0.07] bg-card md:flex">
      {/* Glow violeta, mismo recurso que el hero de la web */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-600/20 blur-3xl" />

      <div className="relative px-6 pb-8 pt-7">
        <Marca />
      </div>

      <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/30">
        Menú
      </p>
      <nav className="relative flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600/15 text-ink'
                  : 'text-ink/55 hover:bg-hairline/[0.04] hover:text-ink'
              )}
            >
              <span
                className={clsx(
                  'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400 transition-opacity',
                  active ? 'opacity-100' : 'opacity-0'
                )}
              />
              <Icon
                size={19}
                strokeWidth={active ? 2.25 : 1.75}
                className={active ? 'text-brand-300' : ''}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="relative m-3 flex items-center gap-3 rounded-xl border border-hairline/[0.06] bg-elevated px-3 py-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {getIniciales(fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
          <p className="truncate text-xs text-ink/45">{email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/45 transition-colors hover:bg-hairline/5 hover:text-brand-300"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </aside>
  )
}
