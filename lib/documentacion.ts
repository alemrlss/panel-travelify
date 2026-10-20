import { Code2, FileText, TrendingUp, Users, Workflow, Wrench, type LucideIcon } from 'lucide-react'
import type { CategoriaDoc } from '@/lib/supabase/types'

// Sin server-only: el editor (cliente) usa slugificar/extraerEncabezados para la vista previa.

export const CATEGORIAS_DOC: Record<CategoriaDoc, { label: string; icon: LucideIcon }> = {
  procesos: { label: 'Procesos', icon: Workflow },
  tecnico: { label: 'Técnico', icon: Code2 },
  ventas: { label: 'Ventas', icon: TrendingUp },
  clientes: { label: 'Clientes', icon: Users },
  herramientas: { label: 'Herramientas', icon: Wrench },
  otros: { label: 'Otros', icon: FileText },
}

export const ORDEN_CATEGORIAS = Object.keys(CATEGORIAS_DOC) as CategoriaDoc[]

export function slugificar(texto: string): string {
  return (
    texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'documento'
  )
}

/** Encabezados ## y ### (fuera de bloques de código) para el índice lateral. */
export function extraerEncabezados(md: string): { nivel: 2 | 3; texto: string; id: string }[] {
  const res: { nivel: 2 | 3; texto: string; id: string }[] = []
  let enCodigo = false
  for (const linea of md.split('\n')) {
    if (linea.trimStart().startsWith('```')) enCodigo = !enCodigo
    if (enCodigo) continue
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(linea)
    if (m) {
      const texto = m[2].replace(/[*_`~[\]]/g, '')
      res.push({ nivel: m[1].length as 2 | 3, texto, id: slugificar(texto) })
    }
  }
  return res
}

/** Texto plano corto para las tarjetas de la lista. */
export function extracto(md: string, max = 160): string {
  const plano = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\-*+\s]+|^\d+\.\s+|\[[ x]\]\s*/gim, '')
    .replace(/[*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plano.length > max ? plano.slice(0, max).trimEnd() + '…' : plano
}
