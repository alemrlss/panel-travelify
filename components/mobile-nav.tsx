'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from '@/lib/clsx'
import { NAV_ITEMS } from '@/lib/nav-items'

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline/[0.08] bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold leading-tight transition-colors active:scale-[0.97]',
              active ? 'text-brand-300' : 'text-ink/45'
            )}
          >
            {active && (
              <span className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-brand-400" />
            )}
            <Icon size={21} strokeWidth={active ? 2.25 : 1.75} />
            {item.labelCorto}
          </Link>
        )
      })}
    </nav>
  )
}
