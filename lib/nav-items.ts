import {
  BookOpenCheck,
  BookText,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

// labelCorto: la barra inferior de móvil tiene 6 ítems (~65 px cada uno a 390 px).
export const NAV_ITEMS: { href: string; label: string; labelCorto: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', labelCorto: 'Inicio', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', labelCorto: 'Pipeline', icon: KanbanSquare },
  { href: '/clientes', label: 'Clientes', labelCorto: 'Clientes', icon: Users },
  { href: '/contabilidad', label: 'Contabilidad', labelCorto: 'Cuentas', icon: BookOpenCheck },
  { href: '/documentacion', label: 'Documentación', labelCorto: 'Docs', icon: BookText },
  { href: '/configuracion', label: 'Ajustes', labelCorto: 'Ajustes', icon: Settings },
]
