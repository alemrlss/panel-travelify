'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Download, Eye, FileSignature, FileText, ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react'
import { darDeBajaContrato, eliminarContrato, registrarContrato, urlContrato } from '@/actions/contratos'
import { createClient } from '@/lib/supabase/client'
import { formatFecha } from '@/lib/formato'
import { estadoContrato } from '@/lib/catalogos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Campo, Input } from '@/components/ui/input'
import { FormDialogo, MensajeError } from '@/components/form-dialogo'
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

/** Un año menos un día desde la fecha (validez típica de un contrato anual). */
function unAñoDespues(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y + 1, m - 1, d - 1)).toISOString().slice(0, 10)
}

export function Contratos({ clienteId, contratos, hoy }: { clienteId: string; contratos: Contrato[]; hoy: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [pendientes, setPendientes] = useState<File[]>([])
  const [inicio, setInicio] = useState(hoy)
  const [fin, setFin] = useState(unAñoDespues(hoy))
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [, startTransition] = useTransition()

  // Paso 1: elegir archivos (se validan aquí). Paso 2: fechas de validez y "Subir".
  function elegir(archivos: File[]) {
    const fallos: string[] = []
    const validos = archivos.filter((f) => {
      if (!EXTENSIONES[f.type]) fallos.push(`"${f.name}": solo PDF, Word (doc/docx), JPG o PNG`)
      else if (f.size > MAX_BYTES) fallos.push(`"${f.name}": pasa de 20 MB`)
      else return true
      return false
    })
    setErrores(fallos)
    setPendientes((p) => [...p, ...validos])
  }

  async function subir() {
    if (!inicio || !fin || fin < inicio) {
      setErrores(['La fecha de fin no puede ser anterior a la de inicio'])
      return
    }
    const fallos: string[] = []
    const supabase = createClient()
    for (const f of pendientes) {
      setSubiendo(f.name)
      // Directo del navegador a Storage (sesión + RLS): las Server Actions limitan el cuerpo a 1 MB.
      const path = `${clienteId}/${crypto.randomUUID()}.${EXTENSIONES[f.type]}`
      const { error } = await supabase.storage.from('contratos').upload(path, f, { contentType: f.type })
      if (error) {
        fallos.push(`"${f.name}": ${error.message}`)
        continue
      }
      const res = await registrarContrato({
        clienteId,
        path,
        nombre: f.name,
        mime: f.type,
        tamano: f.size,
        fechaInicio: inicio,
        fechaFin: fin,
      })
      if (res.error) fallos.push(res.error)
    }
    setSubiendo(null)
    setPendientes([])
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

  // Vigentes primero (por fin de validez), después los de baja.
  const ordenados = contratos
    .slice()
    .sort((a, b) => (a.estado === b.estado ? a.fecha_fin.localeCompare(b.fecha_fin) : a.estado === 'vigente' ? -1 : 1))

  return (
    <div className="space-y-4">
      {pendientes.length === 0 ? (
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
            elegir(Array.from(e.dataTransfer.files))
          }}
          className={clsx(
            'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
            arrastrando ? 'border-brand-400 bg-brand-500/10' : 'border-hairline/15 bg-elevated hover:border-brand-500/50'
          )}
        >
          <Upload size={20} className="text-brand-300" />
          <span className="text-sm font-semibold text-ink/80">Arrastra los contratos aquí o haz clic</span>
          <span className="text-xs text-ink/40">PDF, Word o imagen · hasta 20 MB · varios a la vez</span>
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-brand-500/30 bg-brand-600/[0.06] p-4">
          <p className="text-sm font-semibold text-ink">
            {pendientes.length === 1 ? '1 archivo listo' : `${pendientes.length} archivos listos`} · indica la validez
          </p>
          <ul className="space-y-1">
            {pendientes.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-sm text-ink/75">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="flex-shrink-0 text-brand-300" />
                  <span className="truncate">{f.name}</span>
                </span>
                {!subiendo && (
                  <button
                    type="button"
                    aria-label={`Quitar ${f.name}`}
                    onClick={() => setPendientes((p) => p.filter((_, j) => j !== i))}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-ink/45 hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Válido desde" htmlFor={`contrato-inicio-${clienteId}`}>
              <Input
                id={`contrato-inicio-${clienteId}`}
                type="date"
                required
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value)
                  if (e.target.value) setFin(unAñoDespues(e.target.value))
                }}
              />
            </Campo>
            <Campo label="Válido hasta" htmlFor={`contrato-fin-${clienteId}`}>
              <Input
                id={`contrato-fin-${clienteId}`}
                type="date"
                required
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </Campo>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" disabled={!!subiendo} onClick={() => setPendientes([])}>
              Cancelar
            </Button>
            <Button type="button" variant="ghost" disabled={!!subiendo} onClick={() => input.current?.click()}>
              Añadir más
            </Button>
            <Button type="button" disabled={!!subiendo} onClick={subir}>
              {subiendo ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Subiendo…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Subir {pendientes.length === 1 ? 'contrato' : 'contratos'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const archivos = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (archivos.length) elegir(archivos)
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

      {ordenados.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-2 text-sm text-ink/40">
          <FileSignature size={16} />
          Aún no hay contratos subidos
        </p>
      ) : (
        <ul className="divide-y divide-hairline/[0.06]">
          {ordenados.map((c) => {
            const estado = estadoContrato(c, hoy)
            return (
              <li key={c.id} className={clsx('flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between', c.estado === 'baja' && 'opacity-60')}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
                    {c.mime.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink" title={c.nombre}>
                      {c.nombre}
                    </p>
                    <p className="text-xs text-ink/45">
                      Del {formatFecha(c.fecha_inicio)} al {formatFecha(c.fecha_fin)}
                      {c.estado === 'baja' && c.fecha_baja && ` · de baja el ${formatFecha(c.fecha_baja)}`}
                      {' · '}
                      {tamano(c.tamano_bytes)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center justify-between gap-2 sm:justify-end">
                  <Badge tone={estado.tone}>{estado.label}</Badge>
                  <div className="flex items-center">
                    <Button type="button" variant="ghost" size="icon" title="Ver" aria-label="Ver" onClick={() => abrir(c.id, false)}>
                      <Eye size={15} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" title="Descargar" aria-label="Descargar" onClick={() => abrir(c.id, true)}>
                      <Download size={15} />
                    </Button>
                    {c.estado === 'vigente' && (
                      <FormDialogo
                        titulo="Dar de baja el contrato"
                        trigger={<Ban size={15} />}
                        triggerVariant="ghost"
                        triggerSize="icon"
                        triggerTitle="Dar de baja"
                        action={darDeBajaContrato}
                        submitLabel="Dar de baja"
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <p className="text-sm text-ink/60">«{c.nombre}»</p>
                        <Campo label="Fecha de baja">
                          <Input name="fecha_baja" type="date" required defaultValue={hoy} />
                        </Campo>
                        <Campo label="Motivo (opcional)">
                          <Input name="motivo" placeholder="Ej.: no renueva, cambio de condiciones…" />
                        </Campo>
                      </FormDialogo>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Eliminar archivo"
                      aria-label="Eliminar archivo"
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar el archivo "${c.nombre}"? No se puede deshacer. Si el contrato terminó, mejor dalo de baja.`)) return
                        startTransition(() => eliminarContrato(c.id))
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
