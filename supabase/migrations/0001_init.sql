-- CRM personal Alejandro Morales v1 — schema inicial
-- GHL es la fuente de verdad de prospectos, etapas del pipeline, estado (open/won/lost)
-- y datos de contacto. Estas tablas solo guardan lo que GHL no tiene: el usuario del
-- panel, los clientes promovidos desde GHL (vinculados por ghl_contact_id), sus
-- proyectos, lo que cobra cada uno y los pagos. Importes en céntimos de euro.

create extension if not exists "pgcrypto";

create schema if not exists private;

-- ─── Usuario del panel ───────────────────────────────────────────────────────

create table public.team_members (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  rol text not null default 'administrador' check (rol in ('administrador')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER para evitar la recursión infinita de una policy de team_members
-- que consulta team_members (bug real ya resuelto en salidas/crm-doctora). Vive en
-- el schema private (no expuesto por la API) y con search_path vacío.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where id = (select auth.uid()) and rol = 'administrador' and activo
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.team_members enable row level security;

create policy "team_members: cada usuario lee su propia fila"
  on public.team_members for select to authenticated
  using ((select auth.uid()) = id);

create policy "team_members: administrador acceso total"
  on public.team_members for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ─── Clientes ────────────────────────────────────────────────────────────────

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  ghl_contact_id text not null unique,
  ghl_opportunity_id text,
  -- Nombre/empresa al momento de crear: permite listar sin pedirle a GHL un
  -- contacto por fila. Los datos vivos (email, teléfono) se leen de GHL.
  nombre_cache text not null,
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'finalizado')),
  fecha_inicio date not null default current_date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clientes_estado_idx on public.clientes (estado);

-- ─── Proyectos ───────────────────────────────────────────────────────────────

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in (
    'agente_whatsapp', 'agente_llamadas', 'agente_web', 'web', 'seo_geo', 'redes',
    'publicidad', 'email_marketing', 'crm_automatizaciones', 'reputacion',
    'reactivacion', 'otro'
  )),
  estado text not null default 'planificado' check (estado in (
    'planificado', 'en_curso', 'en_revision', 'entregado', 'pausado'
  )),
  fecha_inicio date,
  fecha_entrega date,
  url text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proyectos_cliente_id_idx on public.proyectos (cliente_id);
create index proyectos_estado_idx on public.proyectos (estado);

-- ─── Servicios contratados (lo que cobra cada cliente) ───────────────────────

create table public.servicios_contratados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  proyecto_id uuid references public.proyectos (id) on delete set null,
  concepto text not null,
  tipo_cobro text not null check (tipo_cobro in ('recurrente_mensual', 'unico')),
  importe_cents integer not null check (importe_cents >= 0),
  -- Solo recurrentes. Tope 28 para que exista en todos los meses.
  dia_cobro smallint check (dia_cobro between 1 and 28),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint servicios_dia_cobro_recurrente check (
    tipo_cobro = 'unico' or dia_cobro is not null
  ),
  constraint servicios_fechas check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create index servicios_cliente_id_idx on public.servicios_contratados (cliente_id);
create index servicios_proyecto_id_idx on public.servicios_contratados (proyecto_id);
create index servicios_activos_idx on public.servicios_contratados (tipo_cobro) where activo;

-- ─── Pagos ───────────────────────────────────────────────────────────────────

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  servicio_id uuid references public.servicios_contratados (id) on delete set null,
  concepto text not null,
  importe_cents integer not null check (importe_cents >= 0),
  -- Primer día del mes cubierto (solo pagos de servicios recurrentes).
  periodo date,
  fecha_vencimiento date not null,
  -- "vencido" no se guarda: es pendiente con fecha_vencimiento < hoy.
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'anulado')),
  fecha_pago date,
  metodo text,
  ghl_invoice_id text, -- reservado para v2 (facturas de GHL)
  notas text,
  created_at timestamptz not null default now(),
  constraint pagos_fecha_pago check (estado <> 'pagado' or fecha_pago is not null),
  -- Hace idempotente "Generar cobros del mes": un pago por servicio y mes.
  constraint pagos_servicio_periodo_unique unique (servicio_id, periodo)
);

create index pagos_cliente_id_idx on public.pagos (cliente_id);
create index pagos_pendientes_idx on public.pagos (fecha_vencimiento) where estado = 'pendiente';
create index pagos_fecha_pago_idx on public.pagos (fecha_pago) where estado = 'pagado';

-- ─── updated_at automático ───────────────────────────────────────────────────

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clientes_updated_at before update on public.clientes
  for each row execute function private.set_updated_at();

create trigger proyectos_updated_at before update on public.proyectos
  for each row execute function private.set_updated_at();

-- ─── RLS: solo el administrador ─────────────────────────────────────────────

alter table public.clientes enable row level security;
alter table public.proyectos enable row level security;
alter table public.servicios_contratados enable row level security;
alter table public.pagos enable row level security;

create policy "clientes: administrador acceso total"
  on public.clientes for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "proyectos: administrador acceso total"
  on public.proyectos for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "servicios_contratados: administrador acceso total"
  on public.servicios_contratados for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "pagos: administrador acceso total"
  on public.pagos for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
