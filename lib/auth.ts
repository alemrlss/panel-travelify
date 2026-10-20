import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Rol } from '@/lib/supabase/types'

export interface CurrentUser {
  id: string
  email: string
  full_name: string
  rol: Rol
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: member } = await supabase
    .from('team_members')
    .select('id, email, full_name, rol, activo')
    .eq('id', user.id)
    .single()

  if (!member || !member.activo) return null

  return {
    id: member.id,
    email: member.email,
    full_name: member.full_name,
    rol: member.rol,
  }
}

/** Panel de un solo usuario: basta con tener sesión y fila activa en team_members. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
