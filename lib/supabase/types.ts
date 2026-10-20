export type Rol = 'administrador'

export type EstadoCliente = 'activo' | 'pausado' | 'finalizado'
export type TipoProyecto =
  | 'agente_whatsapp'
  | 'agente_llamadas'
  | 'agente_web'
  | 'web'
  | 'seo_geo'
  | 'redes'
  | 'publicidad'
  | 'email_marketing'
  | 'crm_automatizaciones'
  | 'reputacion'
  | 'reactivacion'
  | 'otro'
export type EstadoProyecto = 'planificado' | 'en_curso' | 'en_revision' | 'entregado' | 'pausado'
export type TipoFactura = 'venta' | 'compra'
export type EstadoFactura = 'pendiente' | 'pagada'
export type CategoriaDoc = 'procesos' | 'tecnico' | 'ventas' | 'clientes' | 'herramientas' | 'otros'

export type TeamMember = {
  id: string
  email: string
  full_name: string
  rol: Rol
  activo: boolean
  created_at: string
}

export type Cliente = {
  id: string
  ghl_contact_id: string
  ghl_opportunity_id: string | null
  nombre_cache: string
  estado: EstadoCliente
  fecha_inicio: string
  // Solo informativa (lo que cobraría sin descuento); no entra en ningún cálculo.
  cuota_referencia_cents: number | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type Proyecto = {
  id: string
  cliente_id: string
  nombre: string
  tipo: TipoProyecto
  estado: EstadoProyecto
  fecha_inicio: string | null
  fecha_entrega: string | null
  url: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type Factura = {
  id: string
  tipo: TipoFactura
  numero: string
  fecha: string
  cliente_id: string | null
  proyecto_id: string | null
  contraparte: string
  concepto: string
  total_cents: number
  iva_pct: number
  irpf_pct: number
  // Columnas generadas en Postgres a partir de total/iva/irpf (solo lectura).
  base_cents: number
  iva_cents: number
  irpf_cents: number
  estado: EstadoFactura
  fecha_pago: string | null
  pdf_path: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

type FacturaEscribible = Omit<Factura, 'base_cents' | 'iva_cents' | 'irpf_cents'>

export type Documento = {
  id: string
  slug: string
  titulo: string
  categoria: CategoriaDoc
  contenido: string
  fijado: boolean
  busqueda: unknown // tsvector generado, solo para textSearch
  created_at: string
  updated_at: string
}

type DocumentoEscribible = Omit<Documento, 'busqueda'>

// Las filas son `type` (no `interface`): supabase-js exige Row asignable a
// Record<string, unknown>, y una interface no lo es — todo resuelve a never.
// Insert: columnas con default (id, created_at, ...) opcionales; las columnas
// generadas quedan fuera de Insert/Update. Sin Relationships declaradas: las
// queries no usan joins embebidos, se cruzan en JS.
type Tabla<Row, Escribible, Requeridas extends keyof Escribible> = {
  Row: Row
  Insert: Pick<Escribible, Requeridas> & Partial<Omit<Escribible, Requeridas>>
  Update: Partial<Escribible>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      team_members: Tabla<TeamMember, TeamMember, 'id' | 'email' | 'full_name'>
      clientes: Tabla<Cliente, Cliente, 'ghl_contact_id' | 'nombre_cache'>
      proyectos: Tabla<Proyecto, Proyecto, 'cliente_id' | 'nombre' | 'tipo'>
      facturas: Tabla<
        Factura,
        FacturaEscribible,
        'tipo' | 'numero' | 'fecha' | 'contraparte' | 'concepto' | 'total_cents'
      >
      documentos: Tabla<Documento, DocumentoEscribible, 'slug' | 'titulo'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
