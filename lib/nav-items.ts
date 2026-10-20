import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Receipt,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/facturacion', label: 'Facturación', icon: Receipt },
  { href: '/configuracion', label: 'Ajustes', icon: Settings },
]
