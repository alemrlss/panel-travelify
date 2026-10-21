-- La ficha del cliente como registro de lo que ha pasado (2026-10-21):
-- servicios con 3 estados y fecha, contratos con validez y baja, e historial.

-- ─── Servicios contratados (tabla proyectos): En curso / Entregado / Cancelado ─

alter table public.proyectos drop constraint if exists proyectos_estado_check;
update public.proyectos set estado = case
  when estado in ('planificado', 'en_revision') then 'en_curso'
  when estado = 'pausado' then 'cancelado'
  else estado
end;
alter table public.proyectos add constraint proyectos_estado_check
  check (estado in ('en_curso', 'entregado', 'cancelado'));
alter table public.proyectos alter column estado set default 'en_curso';

-- Desde cuándo está en el estado actual (el historial guarda todos los cambios).
alter table public.proyectos add column if not exists estado_desde date;
update public.proyectos set estado_desde = coalesce(fecha_inicio, created_at::date) where estado_desde is null;
alter table public.proyectos alter column estado_desde set default current_date;
alter table public.proyectos alter column estado_desde set not null;

-- ─── Contratos: validez y baja (la tabla estaba vacía) ───────────────────────

alter table public.contratos
  add column if not exists fecha_inicio date not null,
  add column if not exists fecha_fin date not null,
  add column if not exists estado text not null default 'vigente' check (estado in ('vigente', 'baja')),
  add column if not exists fecha_baja date;
alter table public.contratos add constraint contratos_fechas check (fecha_fin >= fecha_inicio);
alter table public.contratos add constraint contratos_baja check (estado = 'vigente' or fecha_baja is not null);

-- ─── Historial del cliente ───────────────────────────────────────────────────

create table public.cliente_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  tipo text not null check (tipo in (
    'cliente_alta', 'cliente_baja', 'cliente_reactivado', 'cliente_vinculado',
    'servicio_alta', 'servicio_estado', 'servicio_cambio', 'servicio_eliminado',
    'contrato_alta', 'contrato_baja', 'contrato_eliminado', 'nota'
  )),
  descripcion text not null check (length(trim(descripcion)) > 0),
  fecha date not null default current_date,  -- cuándo pasó (puede ser anterior al registro)
  servicio_id uuid references public.proyectos (id) on delete set null,
  contrato_id uuid references public.contratos (id) on delete set null,
  created_at timestamptz not null default now()
);

create index cliente_eventos_cliente_idx on public.cliente_eventos (cliente_id, fecha desc, created_at desc);
create index cliente_eventos_servicio_idx on public.cliente_eventos (servicio_id);
create index cliente_eventos_contrato_idx on public.cliente_eventos (contrato_id);

alter table public.cliente_eventos enable row level security;

create policy "cliente_eventos: administrador acceso total"
  on public.cliente_eventos for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Historial inicial a partir de lo que ya existe.
insert into public.cliente_eventos (cliente_id, tipo, descripcion, fecha, created_at)
select id, 'cliente_alta', 'Alta como cliente', fecha_inicio, created_at from public.clientes;

insert into public.cliente_eventos (cliente_id, tipo, descripcion, fecha, servicio_id, created_at)
select cliente_id, 'servicio_alta',
  'Contrató «' || nombre || '»' || case
    when importe_cents is null then ''
    else ' · ' || replace(trim(to_char(importe_cents / 100.0, '999999990.00')), '.', ',') || ' €' ||
      case cobro when 'mensual' then '/mes' when 'trimestral' then '/trimestre' when 'anual' then '/año' else ' (pago único)' end
  end,
  coalesce(fecha_inicio, created_at::date), id, created_at
from public.proyectos;

insert into public.cliente_eventos (cliente_id, tipo, descripcion, fecha, servicio_id, created_at)
select cliente_id, 'servicio_estado',
  '«' || nombre || '» ' || case estado when 'entregado' then 'entregado' else 'cancelado' end,
  estado_desde, id, created_at + interval '1 second'
from public.proyectos where estado in ('entregado', 'cancelado');
