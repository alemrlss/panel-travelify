import type { ZodError } from 'zod'

/** Estado que devuelven las Server Actions usadas con useActionState. */
export type Resultado = { ok?: boolean; error?: string; mensaje?: string }

export const RESULTADO_INICIAL: Resultado = {}

export function errorDeZod(e: ZodError): Resultado {
  return { error: e.issues[0]?.message ?? 'Revisa los datos del formulario.' }
}

/** FormData → objeto plano; los campos vacíos pasan a undefined. */
export function leerForm(formData: FormData): Record<string, string | undefined> {
  const obj: Record<string, string | undefined> = {}
  formData.forEach((v, k) => {
    if (typeof v === 'string') obj[k] = v.trim() === '' ? undefined : v.trim()
  })
  return obj
}
