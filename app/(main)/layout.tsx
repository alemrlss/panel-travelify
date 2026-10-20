import { requireUser } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'
import { MobileTopbar } from '@/components/mobile-topbar'
import { MobileNav } from '@/components/mobile-nav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="flex min-h-screen bg-surface text-ink md:h-screen md:overflow-hidden">
      <Sidebar fullName={user.full_name} email={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar fullName={user.full_name} />
        <main className="flex-1 pb-20 md:overflow-y-auto md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
