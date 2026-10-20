'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bold, Code, Heading2, Link2, List, ListChecks, Save } from 'lucide-react'
import { guardarDocumento } from '@/actions/documentacion'
import { CATEGORIAS_DOC, ORDEN_CATEGORIAS } from '@/lib/documentacion'
import { Button } from '@/components/ui/button'
import { Campo, Input, Select } from '@/components/ui/input'
import { MensajeError } from '@/components/form-dialogo'
import { Markdown } from '@/components/documentacion/markdown'
import { clsx } from '@/lib/clsx'
import type { CategoriaDoc, Documento } from '@/lib/supabase/types'

type Atajo = { icon: React.ReactNode; title: string; antes: string; despues?: string; linea?: boolean }

const ATAJOS: Atajo[] = [
  { icon: <Heading2 size={15} />, title: 'Título de sección', antes: '## ', linea: true },
  { icon: <Bold size={15} />, title: 'Negrita', antes: '**', despues: '**' },
  { icon: <List size={15} />, title: 'Lista', antes: '- ', linea: true },
  { icon: <ListChecks size={15} />, title: 'Lista de tareas', antes: '- [ ] ', linea: true },
  { icon: <Code size={15} />, title: 'Código', antes: '`', despues: '`' },
  { icon: <Link2 size={15} />, title: 'Enlace', antes: '[', despues: '](https://)' },
]

export function EditorDocumento({ documento }: { documento?: Documento }) {
  const router = useRouter()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [titulo, setTitulo] = useState(documento?.titulo ?? '')
  const [categoria, setCategoria] = useState<CategoriaDoc>(documento?.categoria ?? 'procesos')
  const [contenido, setContenido] = useState(documento?.contenido ?? '')
  const [pestaña, setPestaña] = useState<'escribir' | 'vista'>('escribir')
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const guardado = useRef({ titulo, categoria, contenido })
  const sucio =
    titulo !== guardado.current.titulo ||
    categoria !== guardado.current.categoria ||
    contenido !== guardado.current.contenido

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sucio])

  function guardar() {
    setError(undefined)
    const fd = new FormData()
    if (documento) fd.set('id', documento.id)
    fd.set('titulo', titulo)
    fd.set('categoria', categoria)
    fd.set('contenido', contenido)
    startTransition(async () => {
      const res = await guardarDocumento({}, fd)
      if (res.error || !res.slug) return setError(res.error ?? 'No se pudo guardar')
      guardado.current = { titulo, categoria, contenido }
      router.push(`/documentacion/${res.slug}`)
      router.refresh()
    })
  }

  function aplicar(a: Atajo) {
    const ta = ref.current
    if (!ta) return
    const { selectionStart: ini, selectionEnd: fin } = ta
    let nuevo: string
    let cursor: number
    if (a.linea) {
      const inicioLinea = contenido.lastIndexOf('\n', ini - 1) + 1
      nuevo = contenido.slice(0, inicioLinea) + a.antes + contenido.slice(inicioLinea)
      cursor = fin + a.antes.length
    } else {
      const sel = contenido.slice(ini, fin) || (a.title === 'Enlace' ? 'texto' : '')
      nuevo = contenido.slice(0, ini) + a.antes + sel + (a.despues ?? '') + contenido.slice(fin)
      cursor = ini + a.antes.length + sel.length
    }
    setContenido(nuevo)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar()
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault()
          guardar()
        }
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
        <Campo label="Título">
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            autoFocus={!documento}
            placeholder="Cómo doy de alta a un cliente nuevo"
            className="text-base font-semibold sm:text-base"
          />
        </Campo>
        <Campo label="Categoría">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDoc)}>
            {ORDEN_CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIAS_DOC[c].label}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      {/* Pestañas solo en móvil; en desktop editor y vista previa lado a lado */}
      <div className="flex gap-1 rounded-full border border-hairline/10 bg-card p-1 lg:hidden">
        {(['escribir', 'vista'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestaña(p)}
            className={clsx(
              'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              pestaña === p ? 'bg-brand-600 text-white' : 'text-ink/55'
            )}
          >
            {p === 'escribir' ? 'Escribir' : 'Vista previa'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={clsx('flex flex-col', pestaña !== 'escribir' && 'hidden lg:flex')}>
          <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-hairline/10 bg-card px-2 py-1.5">
            {ATAJOS.map((a) => (
              <button
                key={a.title}
                type="button"
                title={a.title}
                aria-label={a.title}
                onClick={() => aplicar(a)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink/55 transition-colors hover:bg-hairline/5 hover:text-ink"
              >
                {a.icon}
              </button>
            ))}
            <span className="ml-auto pr-1 text-[11px] text-ink/30">Markdown</span>
          </div>
          <textarea
            ref={ref}
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            spellCheck
            placeholder={'## Paso 1\n\nDescribe aquí el proceso…\n\n- [ ] Tarea pendiente'}
            className="min-h-[60vh] w-full flex-1 resize-y rounded-b-xl border border-hairline/10 bg-elevated px-4 py-3 font-mono text-[13px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink/25 focus:border-brand-500"
          />
        </div>

        <div
          className={clsx(
            'min-h-[60vh] overflow-y-auto rounded-xl border border-hairline/10 bg-card px-5 py-4',
            pestaña !== 'vista' && 'hidden lg:block'
          )}
        >
          {contenido.trim() ? (
            <Markdown contenido={contenido} />
          ) : (
            <p className="text-sm text-ink/30">La vista previa aparece aquí.</p>
          )}
        </div>
      </div>

      {error && <MensajeError>{error}</MensajeError>}

      <div className="sticky bottom-20 flex items-center justify-end gap-3 md:bottom-4">
        {sucio && <span className="text-xs text-amber-300">Cambios sin guardar</span>}
        <span className="hidden text-xs text-ink/30 sm:inline">Ctrl + S</span>
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
