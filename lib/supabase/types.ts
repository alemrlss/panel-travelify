export type Rol = 'administrador'

export type EstadoCliente = 'activo' | 'pausado' | 'finalizado'
export type TipoProyecto =
  | 'agente_whatsapp'
  | 'agente_llamadas'
  | 'agente_web'
  | 'web'
  | 'mantenimiento_web'
  | 'seo_geo'
  | 'redes'
  | 'publicidad'
  | 'email_marketing'
  | 'crm_automatizaciones'
  | 'reputacion'
  | 'reactivacion'
  | 'otro'
// Recurrente: en_curso | baja. Pago único: planificado → en_curso → en_revision → entregado (o baja).
export type EstadoProyecto = 'planificado' | 'en_curso' | 'en_revision' | 'entregado' | 'baja'
export type EstadoContrato = 'vigente' | 'baja'
export type TipoEvento =
  | 'cliente_alta'
  | 'cliente_baja'
  | 'cliente_reactivado'
  | 'cliente_vinculado'
  | 'servicio_alta'
  | 'servicio_estado'
  | 'servicio_cambio'
  | 'servicio_eliminado'
  | 'contrato_alta'
  | 'contrato_baja'
  | 'contrato_eliminado'
  | 'nota'
export type TipoCobro = 'mensual' | 'trimestral' | 'anual' | 'unico'
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
  // Desde cuándo está en el estado actual; el historial guarda todos los cambios.
  estado_desde: string
  fecha_inicio: string | null
  // Lo que se cobra de verdad (con descuento si lo hay), en céntimos.
  importe_cents: number | null
  cobro: TipoCobro
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
  // Validez del contrato y baja (estado "baja" + fecha_baja).
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoContrato
  fecha_baja: string | null
  created_at: string
}

export type ClienteEvento = {
  id: string
  cliente_id: string
  tipo: TipoEvento
  descripcion: string
  fecha: string // cuándo pasó (puede ser anterior al registro)
  servicio_id: string | null
  contrato_id: string | null
  created_at: string
}

export type MotivoPerdida = 'precio' | 'no_es_el_momento' | 'eligio_a_otro' | 'no_responde' | 'no_encaja' | 'otro'

export type OportunidadPerdida = {
  ghl_opportunity_id: string
  nombre: string
  etapa: string | null
  motivo: MotivoPerdida
  detalle: string | null
  fecha: string
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
      contratos: Tabla<
        Contrato,
        Contrato,
        'cliente_id' | 'nombre' | 'archivo_path' | 'mime' | 'tamano_bytes' | 'fecha_inicio' | 'fecha_fin'
      >
      cliente_eventos: Tabla<ClienteEvento, ClienteEvento, 'cliente_id' | 'tipo' | 'descripcion'>
      documentos: Tabla<Documento, DocumentoEscribible, 'slug' | 'titulo'>
      oportunidades_perdidas: Tabla<OportunidadPerdida, OportunidadPerdida, 'ghl_opportunity_id' | 'nombre' | 'motivo'>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
