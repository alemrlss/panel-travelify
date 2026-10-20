'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Resultado } from '@/lib/acciones'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const mensaje =
      error.code === 'invalid_credentials' ? 'Email o contraseña incorrectos' : error.message
    redirect(`/login?error=${encodeURIComponent(mensaje)}`)
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function cambiarPassword(_prev: Resultado, formData: FormData): Promise<Resultado> {
  await requireUser()
  const password = String(formData.get('password') ?? '')
  const confirmar = String(formData.get('confirmar') ?? '')

  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' }
  if (password !== confirmar) return { error: 'Las contraseñas no coinciden' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: `No se pudo cambiar la contraseña: ${error.message}` }

  return { ok: true, mensaje: 'Contraseña actualizada' }
}
