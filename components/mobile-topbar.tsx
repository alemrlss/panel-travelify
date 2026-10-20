import { LogOut } from 'lucide-react'
import { logout } from '@/actions/auth'
import { getIniciales } from '@/lib/iniciales'
import { Marca } from '@/components/brand'

export function MobileTopbar({ fullName }: { fullName: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hairline/[0.08] bg-card/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur md:hidden">
      <Marca compact />
      <div className="flex items-center gap-1.5">
        <span
          title={fullName}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white"
        >
          {getIniciales(fullName)}
        </span>
        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/55 transition-colors active:bg-hairline/10 active:text-brand-300"
          >
            <LogOut size={19} />
          </button>
        </form>
      </div>
    </header>
  )
}
