import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type { TipoEvento } from '@/lib/supabase/types'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Apunta un evento en el historial del cliente. Si falla, no rompe la acción
 * principal (el cambio ya está hecho): solo queda en el log del servidor.
 */
export async function registrarEvento(
  supabase: Supabase,
  ev: {
    cliente_id: string
    tipo: TipoEvento
    descripcion: string
    fecha?: string
    servicio_id?: string | null
    contrato_id?: string | null
  }
) {
  const { error } = await supabase.from('cliente_eventos').insert(ev)
  if (error) console.error(`No se pudo registrar el evento ${ev.tipo}: ${error.message}`)
}
