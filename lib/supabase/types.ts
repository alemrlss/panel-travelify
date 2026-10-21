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
  // null si se creó a mano; si viene del pipeline, el contacto y la oportunidad de GHL.
  ghl_contact_id: string | null
  ghl_opportunity_id: string | null
  empresa: string
  responsable: string | null
  telefono: string | null
  email: string | null
  estado: EstadoCliente
  fecha_inicio: string
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

export type Contrato = {
  id: string
  cliente_id: string
  nombre: string
  archivo_path: string
  mime: string
  tamano_bytes: number
  created_at: string
}

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
// generadas (documentos.busqueda) quedan fuera de Insert/Update. Sin Relationships declaradas: las
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
      clientes: Tabla<Cliente, Cliente, 'empresa'>
      proyectos: Tabla<Proyecto, Proyecto, 'cliente_id' | 'nombre' | 'tipo'>
      contratos: Tabla<Contrato, Contrato, 'cliente_id' | 'nombre' | 'archivo_path' | 'mime' | 'tamano_bytes'>
      documentos: Tabla<Documento, DocumentoEscribible, 'slug' | 'titulo'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
