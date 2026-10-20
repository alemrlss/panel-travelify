'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Search, UserPlus } from 'lucide-react'
import { buscarContactos, crearCliente, type ContactoEncontrado } from '@/actions/clientes'
import { Button } from '@/components/ui/button'
import { Dialogo } from '@/components/ui/dialogo'
import { Input } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'

export function NuevoCliente() {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)}>
        <UserPlus size={16} />
        Nuevo cliente
      </Button>
      <Dialogo abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Nuevo cliente">
        <Buscador />
      </Dialogo>
    </>
  )
}

function Buscador() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<ContactoEncontrado[]>([])
  const [error, setError] = useState<string>()
  const [buscando, startBuscar] = useTransition()
  const [creando, startCrear] = useTransition()
  const [elegido, setElegido] = useState<string>()

  // Búsqueda con debounce; sin texto muestra los contactos más recientes.
  useEffect(() => {
    const t = setTimeout(() => {
      startBuscar(async () => {
        const res = await buscarContactos(query)
        setResultados(res.contactos)
        setError(res.error)
      })
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/55">
        Elige el contacto de tu CRM que se convierte en cliente. Sus datos (email, teléfono) se
        siguen leyendo de ahí.
      </p>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35"
        />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre, email o teléfono"
          className="pl-10 pr-10"
        />
        {buscando && (
          <Loader2
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-ink/40"
          />
        )}
      </div>

      {error && <MensajeError>{error}</MensajeError>}

      <ul className="max-h-80 space-y-1.5 overflow-y-auto">
        {resultados.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-hairline/[0.07] bg-elevated px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{c.nombre}</p>
              <p className="truncate text-xs text-ink/45">{c.detalle || 'Sin datos de contacto'}</p>
            </div>
            {c.clienteId ? (
              <Link
                href={`/clientes/${c.clienteId}`}
                className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                Ya es cliente
                <ArrowRight size={13} />
              </Link>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={creando}
                onClick={() => {
                  setElegido(c.id)
                  startCrear(() => crearCliente({ ghlContactId: c.id, nombre: c.nombre }))
                }}
              >
                {creando && elegido === c.id ? 'Creando…' : 'Elegir'}
              </Button>
            )}
          </li>
        ))}
        {!buscando && !error && resultados.length === 0 && (
          <li className="py-6 text-center text-sm text-ink/45">No hay contactos que coincidan.</li>
        )}
      </ul>
    </div>
  )
}
