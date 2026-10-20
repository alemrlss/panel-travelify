import { strToU8, zipSync, type Zippable } from 'fflate'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getFacturas } from '@/lib/contabilidad'
import { inicioDeMes } from '@/lib/formato'
import { aCSV, importeCSV } from '@/lib/csv'
import type { Factura } from '@/lib/supabase/types'

// ZIP mensual para la gestoría: ventas.csv + compras.csv + los archivos adjuntos
// en ventas/ y compras/. Se arma en memoria (volumen de un autónomo).

function sanear(s: string, max = 80) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
}

function nombreArchivo(f: Factura) {
  const ext = f.pdf_path?.split('.').pop() ?? 'pdf'
  return `${f.fecha}_${sanear(f.numero, 30)}_${sanear(f.contraparte, 40)}.${ext}`
}

const columnas = (tipo: 'venta' | 'compra', archivos: Map<string, string>) => [
  { titulo: 'Número', valor: (f: Factura) => f.numero },
  { titulo: 'Fecha', valor: (f: Factura) => f.fecha },
  { titulo: tipo === 'venta' ? 'Cliente' : 'Proveedor', valor: (f: Factura) => f.contraparte },
  { titulo: 'Concepto', valor: (f: Factura) => f.concepto },
  { titulo: 'Base', valor: (f: Factura) => importeCSV(f.base_cents) },
  { titulo: 'IVA %', valor: (f: Factura) => String(f.iva_pct) },
  { titulo: 'IVA', valor: (f: Factura) => importeCSV(f.iva_cents) },
  { titulo: 'IRPF %', valor: (f: Factura) => String(f.irpf_pct) },
  { titulo: 'IRPF', valor: (f: Factura) => importeCSV(f.irpf_cents) },
  { titulo: 'Total', valor: (f: Factura) => importeCSV(f.total_cents) },
  {
    titulo: 'Estado',
    valor: (f: Factura) =>
      f.estado === 'pagada' ? (tipo === 'venta' ? 'Cobrada' : 'Pagada') : 'Pendiente',
  },
  { titulo: tipo === 'venta' ? 'Fecha de cobro' : 'Fecha de pago', valor: (f: Factura) => f.fecha_pago ?? '' },
  { titulo: 'Archivo', valor: (f: Factura) => archivos.get(f.id) ?? '' },
]

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const mes = new URL(request.url).searchParams.get('mes') ?? ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return new Response('Mes no válido', { status: 400 })

  const desde = `${mes}-01`
  const facturas = (await getFacturas({ desde, hasta: inicioDeMes(1, desde) })).sort((a, b) =>
    a.fecha === b.fecha ? a.numero.localeCompare(b.numero) : a.fecha.localeCompare(b.fecha)
  )

  const supabase = await createClient()
  const zip: Zippable = {}
  const archivos = new Map<string, string>()
  const errores: string[] = []

  for (const f of facturas) {
    if (!f.pdf_path) continue
    const carpeta = f.tipo === 'venta' ? 'ventas' : 'compras'
    let nombre = nombreArchivo(f)
    // Dos facturas con la misma fecha/número/contraparte: no pisar el archivo.
    while (zip[`${carpeta}/${nombre}`]) nombre = nombre.replace(/(\.\w+)$/, '-2$1')
    const { data, error } = await supabase.storage.from('facturas').download(f.pdf_path)
    if (error || !data) {
      errores.push(`${f.numero} (${f.contraparte}): no se pudo descargar el archivo adjunto`)
      continue
    }
    zip[`${carpeta}/${nombre}`] = new Uint8Array(await data.arrayBuffer())
    archivos.set(f.id, `${carpeta}/${nombre}`)
  }

  const ventas = facturas.filter((f) => f.tipo === 'venta')
  const compras = facturas.filter((f) => f.tipo === 'compra')
  zip['ventas.csv'] = strToU8(aCSV(ventas, columnas('venta', archivos)))
  zip['compras.csv'] = strToU8(aCSV(compras, columnas('compra', archivos)))
  if (errores.length) zip['ERRORES.txt'] = strToU8(errores.join('\r\n') + '\r\n')

  const contenido = zipSync(zip, { level: 6 })
  return new Response(new Blob([contenido as BlobPart], { type: 'application/zip' }), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="facturas-${mes}.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
