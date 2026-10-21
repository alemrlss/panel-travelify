import type { Tone } from '@/components/ui/badge'
import type {
  EstadoCliente,
  TipoCobro,
  TipoProyecto,
} from '@/lib/supabase/types'

// Etiquetas visibles de los valores guardados en Supabase. Tienen que coincidir
// con los check de supabase/migrations/.

export const ESTADOS_CLIENTE: Record<EstadoCliente, { label: string; tone: Tone }> = {
  activo: { label: 'Activo', tone: 'success' },
  pausado: { label: 'Pausado', tone: 'warning' },
  finalizado: { label: 'De baja', tone: 'neutral' },
}

export const TIPOS_PROYECTO: Record<TipoProyecto, string> = {
  agente_whatsapp: 'Agente de WhatsApp',
  agente_llamadas: 'Agente de Llamadas IA',
  agente_web: 'Agente IA para Web',
  web: 'Desarrollo Web',
  mantenimiento_web: 'Mantenimiento Web',
  seo_geo: 'SEO y GEO',
  redes: 'Gestión de Redes Sociales',
  publicidad: 'Gestión Publicitaria',
  email_marketing: 'Email Marketing',
  crm_automatizaciones: 'CRM y Automatizaciones',
  reputacion: 'Reputación / Reseñas',
  reactivacion: 'Reactivación de Clientes',
  otro: 'Otro',
}

/** Estado visible de un contrato: de baja, vencido, por vencer (30 días) o vigente. */
export function estadoContrato(
  c: { estado: 'vigente' | 'baja'; fecha_fin: string },
  hoy: string
): { label: string; tone: Tone } {
  if (c.estado === 'baja') return { label: 'De baja', tone: 'neutral' }
  if (c.fecha_fin < hoy) return { label: 'Vencido', tone: 'danger' }
  const dias = Math.round((Date.parse(c.fecha_fin) - Date.parse(hoy)) / 86_400_000)
  if (dias <= 30) return { label: dias === 0 ? 'Vence hoy' : `Vence en ${dias} días`, tone: 'warning' }
  return { label: 'Vigente', tone: 'success' }
}

export const TIPOS_COBRO: Record<TipoCobro, { label: string; sufijo: string }> = {
  mensual: { label: 'Mensual', sufijo: '/mes' },
  trimestral: { label: 'Trimestral', sufijo: '/trimestre' },
  anual: { label: 'Anual', sufijo: '/año' },
  unico: { label: 'Pago único', sufijo: '' },
}

export function opciones<T extends string>(
  catalogo: Record<T, string | { label: string }>
): { value: T; label: string }[] {
  return (Object.keys(catalogo) as T[]).map((value) => {
    const v = catalogo[value]
    return { value, label: typeof v === 'string' ? v : v.label }
  })
}
