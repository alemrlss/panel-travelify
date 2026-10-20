'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Paperclip, X } from 'lucide-react'
import { descartarPdf, guardarFactura } from '@/actions/contabilidad'
import { createClient } from '@/lib/supabase/client'
import { centsAEurosInput, formatEUR, hoyISO, parseEurosACents } from '@/lib/formato'
import { IRPF_OPCIONES, IVA_OPCIONES, desglosar } from '@/lib/impuestos'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select, Textarea } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'
import type { Factura, TipoFactura } from '@/lib/supabase/types'

const MAX_BYTES = 10 * 1024 * 1024
const TIPOS_PDF: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}
const OTRO = '__otro'

export interface OpcionesFactura {
  clientes: { id: string; nombre_cache: string }[]
  proyectos: { id: string; nombre: string; cliente_id: string }[]
  proveedores: string[]
  numeroSugerido: string
}

export function FormFactura({
  tipo,
  factura,
  opciones,
  clienteFijo,
  onOk,
}: {
  tipo: TipoFactura
  factura?: Factura
  opciones: OpcionesFactura
  clienteFijo?: { id: string; nombre_cache: string }
  onOk: () => void
}) {
  const router = useRouter()
  const esVenta = tipo === 'venta'
  const [clienteSel, setClienteSel] = useState(
    clienteFijo?.id ?? factura?.cliente_id ?? (factura ? OTRO : (opciones.clientes[0]?.id ?? OTRO))
  )
  const [importe, setImporte] = useState(factura ? centsAEurosInput(factura.total_cents) : '')
  const [iva, setIva] = useState(factura?.iva_pct ?? 21)
  const [irpf, setIrpf] = useState(factura?.irpf_pct ?? 0)
  const [pagada, setPagada] = useState(factura?.estado === 'pagada')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const cents = parseEurosACents(importe)
  const desglose = cents === null ? null : desglosar(cents, iva, irpf)
  const proyectosDelCliente = opciones.proyectos.filter((p) => p.cliente_id === clienteSel)

  function elegirArchivo(f: File | undefined) {
    setError(undefined)
    if (!f) return setArchivo(null)
    if (!TIPOS_PDF[f.type]) return setError('El archivo tiene que ser PDF, JPG o PNG')
    if (f.size > MAX_BYTES) return setError('El archivo no puede pasar de 10 MB')
    setArchivo(f)
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    setPending(true)
    const formData = new FormData(e.currentTarget)
    let subido: string | null = null

    try {
      // El PDF va directo del navegador a Storage (sesión del usuario + RLS):
      // las Server Actions limitan el cuerpo a 1 MB.
      if (archivo) {
        const año = String(formData.get('fecha') ?? hoyISO()).slice(0, 4)
        subido = `${tipo}/${año}/${crypto.randomUUID()}.${TIPOS_PDF[archivo.type]}`
        const { error: upError } = await createClient()
          .storage.from('facturas')
          .upload(subido, archivo, { contentType: archivo.type })
        if (upError) {
          subido = null
          throw new Error(`No se pudo subir el archivo: ${upError.message}`)
        }
        formData.set('pdf_path', subido)
      }

      const res = await guardarFactura({}, formData)
      if (res.error) {
        if (subido) await descartarPdf(subido)
        throw new Error(res.error)
      }
      router.refresh()
      onOk()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />
      {factura && <input type="hidden" name="id" value={factura.id} />}

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Número">
          <Input
            name="numero"
            required
            defaultValue={factura?.numero ?? (esVenta ? opciones.numeroSugerido : '')}
            placeholder={esVenta ? '2026-001' : 'Nº del proveedor'}
          />
        </Campo>
        <Campo label="Fecha">
          <Input name="fecha" type="date" required defaultValue={factura?.fecha ?? hoyISO()} />
        </Campo>
      </div>

      {esVenta ? (
        clienteFijo ? (
          <input type="hidden" name="cliente_id" value={clienteFijo.id} />
        ) : (
          <>
            {clienteSel !== OTRO && <input type="hidden" name="cliente_id" value={clienteSel} />}
            <Campo label="Cliente">
              <Select value={clienteSel} onChange={(e) => setClienteSel(e.target.value)}>
                {opciones.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_cache}
                  </option>
                ))}
                <option value={OTRO}>Otro (no es cliente del CRM)…</option>
              </Select>
            </Campo>
            {clienteSel === OTRO && (
              <Campo label="Nombre del cliente">
                <Input name="contraparte" required defaultValue={factura?.contraparte ?? ''} />
              </Campo>
            )}
          </>
        )
      ) : (
        <Campo label="Proveedor">
          <Input
            name="contraparte"
            required
            list="proveedores-usados"
            defaultValue={factura?.contraparte ?? ''}
            placeholder="Google, Vercel, gestoría…"
          />
          <datalist id="proveedores-usados">
            {opciones.proveedores.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Campo>
      )}

      <Campo label="Concepto">
        <Input
          name="concepto"
          required
          defaultValue={factura?.concepto ?? ''}
          placeholder={esVenta ? 'Agente de WhatsApp · octubre' : 'Suscripción mensual'}
        />
      </Campo>

      <div className="grid grid-cols-3 gap-3">
        <Campo label="Total (€)">
          <Input
            name="importe"
            required
            inputMode="decimal"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder="1.210,00"
          />
        </Campo>
        <Campo label="IVA">
          <Select name="iva_pct" value={iva} onChange={(e) => setIva(Number(e.target.value))}>
            {IVA_OPCIONES.map((o) => (
              <option key={o} value={o}>
                {o} %
              </option>
            ))}
          </Select>
        </Campo>
        <Campo label="IRPF">
          <Select name="irpf_pct" value={irpf} onChange={(e) => setIrpf(Number(e.target.value))}>
            {IRPF_OPCIONES.map((o) => (
              <option key={o} value={o}>
                {o === 0 ? 'No' : `${o} %`}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <p className="tabular -mt-1 text-xs text-ink/50">
        {desglose
          ? `Base ${formatEUR(desglose.base)} · IVA ${formatEUR(desglose.iva)}${irpf ? ` · IRPF −${formatEUR(desglose.irpf)}` : ''}`
          : 'Pon el total final de la factura: el panel calcula la base y los impuestos.'}
      </p>

      {esVenta && proyectosDelCliente.length > 0 && (
        <Campo label="Proyecto (opcional)">
          <Select name="proyecto_id" defaultValue={factura?.proyecto_id ?? ''}>
            <option value="">— Ninguno —</option>
            {proyectosDelCliente.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Campo>
      )}

      <div className="rounded-xl border border-hairline/[0.07] bg-elevated p-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink/80">
          <input
            type="checkbox"
            name="pagada"
            checked={pagada}
            onChange={(e) => setPagada(e.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          {esVenta ? 'Ya está cobrada' : 'Ya está pagada'}
        </label>
        {pagada && (
          <Campo label={esVenta ? 'Fecha de cobro' : 'Fecha de pago'} className="mt-3">
            <Input name="fecha_pago" type="date" required defaultValue={factura?.fecha_pago ?? hoyISO()} />
          </Campo>
        )}
      </div>

      <Campo label="Factura (PDF, JPG o PNG · máx. 10 MB)">
        {archivo ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-500/30 bg-brand-500/[0.06] px-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink/80">
              <FileText size={16} className="flex-shrink-0 text-brand-300" />
              <span className="truncate">{archivo.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setArchivo(null)}
              aria-label="Quitar archivo"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-ink/50 hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-hairline/15 bg-elevated px-3 py-3 text-sm text-ink/55 transition-colors hover:border-brand-500/50 hover:text-ink">
            <Paperclip size={16} />
            {factura?.pdf_path ? 'Reemplazar el archivo adjunto' : 'Adjuntar archivo'}
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => elegirArchivo(e.target.files?.[0])}
            />
          </label>
        )}
      </Campo>

      <Campo label="Notas">
        <Textarea name="notas" defaultValue={factura?.notas ?? ''} className="min-h-[64px]" />
      </Campo>

      {error && <MensajeError>{error}</MensajeError>}
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : factura ? 'Guardar cambios' : esVenta ? 'Registrar venta' : 'Registrar compra'}
        </Button>
      </div>
    </form>
  )
}
