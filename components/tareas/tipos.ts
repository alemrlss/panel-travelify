import type { EstadoCliente, Tarea, TareaSubtarea } from '@/lib/supabase/types'

export type TareaConSubtareas = Tarea & { subtareas: TareaSubtarea[] }

export type OpcionCliente = { id: string; empresa: string; estado: EstadoCliente }
export type OpcionServicio = { id: string; cliente_id: string; nombre: string }
