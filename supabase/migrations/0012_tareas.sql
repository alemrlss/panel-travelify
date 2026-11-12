-- Tareas (2026-11-12): kanban Por hacer / En curso / Hecho.
-- Aditiva: no toca tablas existentes. Cliente y servicio opcionales (tareas internas);
-- on delete set null para no perder tareas al borrar un cliente o servicio.

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  descripcion text,
  estado text not null default 'por_hacer' check (estado in ('por_hacer', 'en_curso', 'hecho')),
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  fecha_limite date,
  cliente_id uuid references public.clientes (id) on delete set null,
  proyecto_id uuid references public.proyectos (id) on delete set null,
  completada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tareas_completada check ((estado = 'hecho') = (completada_at is not null))
);

create index tareas_estado_idx on public.tareas (estado);
create index tareas_cliente_idx on public.tareas (cliente_id) where cliente_id is not null;
create index tareas_proyecto_idx on public.tareas (proyecto_id) where proyecto_id is not null;
create index tareas_pendientes_fecha_idx on public.tareas (fecha_limite) where estado <> 'hecho';

create table public.tarea_subtareas (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas (id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0),
  hecha boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

create index tarea_subtareas_tarea_idx on public.tarea_subtareas (tarea_id, orden);

create trigger tareas_updated_at before update on public.tareas
  for each row execute function private.set_updated_at();

alter table public.tareas enable row level security;
alter table public.tarea_subtareas enable row level security;

create policy "tareas: administrador acceso total"
  on public.tareas for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "tarea_subtareas: administrador acceso total"
  on public.tarea_subtareas for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
