// CSV pensado para Excel en español: separador ";", BOM UTF-8 (tildes bien) y
// decimales con coma.

export function importeCSV(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function celda(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? '' : String(v)
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function aCSV<T>(filas: T[], columnas: { titulo: string; valor: (f: T) => string | number | null }[]) {
  const lineas = [
    columnas.map((c) => celda(c.titulo)).join(';'),
    ...filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';')),
  ]
  return '﻿' + lineas.join('\r\n') + '\r\n'
}
