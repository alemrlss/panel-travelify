'use client'

import { useState, useTransition } from 'react'
import { Loader2, MessageSquare, Trash2 } from 'lucide-react'
import { anadirNotaLead, eliminarNotaLead } from '@/actions/leads'
import { formatFechaHora } from '@/lib/formato'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'
import type { LeadNota } from '@/lib/supabase/types'

/** Notas internas del lead (por contacto de GHL): la más reciente arriba. */
export function NotasLead({
  contactId,
  opportunityId,
  notasIniciales,
}: {
  contactId: string
  opportunityId?: string
  notasIniciales: LeadNota[]
}) {
  const [notas, setNotas] = useState(notasIniciales)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, startGuardar] = useTransition()
  const [, startBorrar] = useTransition()

  function guardar() {
    if (!texto.trim()) return
    setError(null)
    startGuardar(async () => {
      const res = await anadirNotaLead({ contactId, opportunityId, texto })
      if (res.error || !res.nota) {
        setError(res.error ?? 'No se pudo guardar la nota')
        return
      }
      setNotas((n) => [res.nota!, ...n])
      setTexto('')
    })
  }

  function borrar(id: string) {
    if (!window.confirm('¿Eliminar esta nota?')) return
    const antes = notas
    setNotas((n) => n.filter((x) => x.id !== id))
    startBorrar(async () => {
      const res = await eliminarNotaLead(id)
      if (res.error) {
        setNotas(antes)
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={`nota-lead-${contactId}`} className="sr-only">
          Nueva nota
        </label>
        <Textarea
          id={`nota-lead-${contactId}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter guarda sin soltar el teclado.
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) guardar()
          }}
          placeholder="Qué hablasteis, qué le interesa, cuándo volver a llamarle…"
          rows={3}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink/35">Ctrl + Enter para guardar</span>
          <Button type="button" size="sm" disabled={guardando || !texto.trim()} onClick={guardar}>
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
            Guardar nota
          </Button>
        </div>
        {error && <MensajeError>{error}</MensajeError>}
      </div>

      {notas.length === 0 ? (
        <p className="py-2 text-center text-sm text-ink/40">Aún no hay notas de este lead</p>
      ) : (
        <ul className="space-y-2">
          {notas.map((n) => (
            <li key={n.id} className="group rounded-xl border border-hairline/[0.06] bg-elevated px-3.5 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="tabular text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                  {formatFechaHora(n.created_at)}
                </p>
                <button
                  type="button"
                  onClick={() => borrar(n.id)}
                  aria-label="Eliminar nota"
                  title="Eliminar nota"
                  className="-mr-1 -mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-ink/30 transition-colors hover:bg-hairline/5 hover:text-red-300"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-ink/85">{n.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
