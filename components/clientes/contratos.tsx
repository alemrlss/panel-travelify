'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Eye, FileSignature, FileText, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { eliminarContrato, registrarContrato, urlContrato } from '@/actions/contratos'
import { createClient } from '@/lib/supabase/client'
import { formatFecha } from '@/lib/formato'
import { Button } from '@/components/ui/button'
import { MensajeError } from '@/components/form-dialogo'
import { clsx } from '@/lib/clsx'
import type { Contrato } from '@/lib/supabase/types'

const MAX_BYTES = 20 * 1024 * 1024
const EXTENSIONES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}
const ACCEPT = Object.keys(EXTENSIONES).join(',')

function tamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export function Contratos({ clienteId, contratos }: { clienteId: string; contratos: Contrato[] }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [, startTransition] = useTransition()

  async function subir(archivos: File[]) {
    setErrores([])
    const fallos: string[] = []
    const supabase = createClient()
    for (const f of archivos) {
      const ext = EXTENSIONES[f.type]
      if (!ext) {
        fallos.push(`"${f.name}": solo PDF, Word (doc/docx), JPG o PNG`)
        continue
      }
      if (f.size > MAX_BYTES) {
        fallos.push(`"${f.name}": pasa de 20 MB`)
        continue
      }
      setSubiendo(f.name)
      // Directo del navegador a Storage (sesión + RLS): las Server Actions limitan el cuerpo a 1 MB.
      const path = `${clienteId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('contratos').upload(path, f, { contentType: f.type })
      if (error) {
        fallos.push(`"${f.name}": ${error.message}`)
        continue
      }
      const res = await registrarContrato({ clienteId, path, nombre: f.name, mime: f.type, tamano: f.size })
      if (res.error) fallos.push(res.error)
    }
    setSubiendo(null)
    setErrores(fallos)
    router.refresh()
  }

  function abrir(id: string, descargar: boolean) {
    // La pestaña se abre antes del await: si no, el navegador la bloquea como popup.
    const pestaña = descargar ? null : window.open('', '_blank')
    startTransition(async () => {
      const res = await urlContrato(id, descargar)
      if (!res.url) {
        pestaña?.close()
        setErrores([res.error ?? 'No se pudo abrir el archivo'])
        return
      }
      if (pestaña) pestaña.location.href = res.url
      else window.location.href = res.url
    })
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          subir(Array.from(e.dataTransfer.files))
        }}
        disabled={!!subiendo}
        className={clsx(
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
          arrastrando
            ? 'border-brand-400 bg-brand-500/10'
            : 'border-hairline/15 bg-elevated hover:border-brand-500/50'
        )}
      >
        {subiendo ? (
          <>
            <Loader2 size={20} className="animate-spin text-brand-300" />
            <span className="max-w-full truncate text-sm text-ink/70">Subiendo {subiendo}…</span>
          </>
        ) : (
          <>
            <Upload size={20} className="text-brand-300" />
            <span className="text-sm font-semibold text-ink/80">Arrastra los contratos aquí o haz clic</span>
            <span className="text-xs text-ink/40">PDF, Word o imagen · hasta 20 MB · varios a la vez</span>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const archivos = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (archivos.length) subir(archivos)
        }}
      />

      {errores.length > 0 && (
        <MensajeError>
          <span className="block">{errores.length === 1 ? errores[0] : 'Algunos archivos no se subieron:'}</span>
          {errores.length > 1 && (
            <ul className="mt-1 list-disc pl-4">
              {errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </MensajeError>
      )}

      {contratos.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-2 text-sm text-ink/40">
          <FileSignature size={16} />
          Aún no hay contratos subidos
        </p>
      ) : (
        <ul className="divide-y divide-hairline/[0.06]">
          {contratos.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
                  {c.mime.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink" title={c.nombre}>
                    {c.nombre}
                  </p>
                  <p className="text-xs text-ink/40">
                    {tamano(c.tamano_bytes)} · subido el {formatFecha(c.created_at.slice(0, 10))}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center">
                <Button type="button" variant="ghost" size="icon" title="Ver" aria-label="Ver" onClick={() => abrir(c.id, false)}>
                  <Eye size={15} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Descargar"
                  aria-label="Descargar"
                  onClick={() => abrir(c.id, true)}
                >
                  <Download size={15} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Eliminar"
                  aria-label="Eliminar"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar "${c.nombre}"? No se puede deshacer.`)) return
                    startTransition(() => eliminarContrato(c.id))
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
