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
export type TipoCobro = 'recurrente_mensual' | 'unico'
export type EstadoPago = 'pendiente' | 'pagado' | 'anulado'

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

export type ServicioContratado = {
  id: string
  cliente_id: string
  proyecto_id: string | null
  concepto: string
  tipo_cobro: TipoCobro
  importe_cents: number
  dia_cobro: number | null
  fecha_inicio: string
  fecha_fin: string | null
  activo: boolean
  created_at: string
}

export type Pago = {
  id: string
  cliente_id: string
  servicio_id: string | null
  concepto: string
  importe_cents: number
  periodo: string | null
  fecha_vencimiento: string
  estado: EstadoPago
  fecha_pago: string | null
  metodo: string | null
  ghl_invoice_id: string | null
  notas: string | null
  created_at: string
}

// Las filas son `type` (no `interface`): supabase-js exige Row asignable a
// Record<string, unknown>, y una interface no lo es — todo resuelve a never.
// Insert: columnas con default (id, created_at, ...) opcionales. Sin
// Relationships declaradas: las queries no usan joins embebidos, se cruzan en JS.
type Tabla<Row, Requeridas extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Requeridas> & Partial<Omit<Row, Requeridas>>
  Update: Partial<Row>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      team_members: Tabla<TeamMember, 'id' | 'email' | 'full_name'>
      clientes: Tabla<Cliente, 'ghl_contact_id' | 'nombre_cache'>
      proyectos: Tabla<Proyecto, 'cliente_id' | 'nombre' | 'tipo'>
      servicios_contratados: Tabla<
        ServicioContratado,
        'cliente_id' | 'concepto' | 'tipo_cobro' | 'importe_cents'
      >
      pagos: Tabla<Pago, 'cliente_id' | 'concepto' | 'importe_cents' | 'fecha_vencimiento'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
