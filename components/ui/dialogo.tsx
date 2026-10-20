'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Modal sobre <dialog> nativo: foco atrapado, Escape y backdrop sin librerías.
export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (abierto && !dialog.open) dialog.showModal()
    if (!abierto && dialog.open) dialog.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-hairline/10 bg-card p-0 text-ink shadow-lift backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-hairline/[0.07] px-5 py-4">
        <h2 className="text-base font-bold">{titulo}</h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/50 hover:bg-hairline/5 hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>
      {abierto && <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>}
    </dialog>
  )
}
