-- Tareas recurrentes (2026-11-12). Plantillas con una regla (cada N días, día del mes,
-- días de la semana) que generan tareas normales cada mañana con pg_cron.
-- Se crean siempre, aunque la anterior siga pendiente (decisión de Alejandro).
-- Idempotente: unique (recurrencia_id, fecha_programada). Recupera hasta 31 días
-- si el cron no corrió (p. ej. proyecto pausado). Requiere la extensión pg_cron.

-- ─── Plantillas ──────────────────────────────────────────────────────────────

create table public.tarea_recurrencias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  descripcion text,
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  cliente_id uuid references public.clientes (id) on delete set null,
  proyecto_id uuid references public.proyectos (id) on delete set null,
  -- Checklist que se copia a cada tarea generada (una entrada por paso).
  subtareas text[] not null default '{}',
  tipo text not null check (tipo in ('cada_n_dias', 'dia_mes', 'dias_semana')),
  cada_dias integer check (cada_dias between 1 and 365),
  -- Si el mes no tiene ese día (31 en noviembre), se usa el último día del mes.
  dia_mes smallint check (dia_mes between 1 and 31),
  -- ISO: 1 = lunes … 7 = domingo.
  dias_semana smallint[] check (dias_semana <@ '{1,2,3,4,5,6,7}'::smallint[]),
  -- fecha_limite de la tarea = fecha programada + plazo_dias.
  plazo_dias integer not null default 0 check (plazo_dias between 0 and 60),
  fecha_inicio date not null default current_date,
  activa boolean not null default true,
  -- Último día ya procesado por el generador.
  ultima_generacion date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tarea_recurrencias_regla check (
    (tipo = 'cada_n_dias' and cada_dias is not null)
    or (tipo = 'dia_mes' and dia_mes is not null)
    or (tipo = 'dias_semana' and coalesce(cardinality(dias_semana), 0) > 0)
  )
);

create index tarea_recurrencias_activas_idx on public.tarea_recurrencias (activa) where activa;

create trigger tarea_recurrencias_updated_at before update on public.tarea_recurrencias
  for each row execute function private.set_updated_at();

alter table public.tarea_recurrencias enable row level security;

create policy "tarea_recurrencias: administrador acceso total"
  on public.tarea_recurrencias for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ─── Vínculo de las tareas generadas ─────────────────────────────────────────

alter table public.tareas
  add column recurrencia_id uuid references public.tarea_recurrencias (id) on delete set null,
  add column fecha_programada date;

create unique index tareas_recurrencia_fecha_uq
  on public.tareas (recurrencia_id, fecha_programada)
  where recurrencia_id is not null;

-- ─── Regla: ¿toca la plantilla r el día d? ───────────────────────────────────

create or replace function private.toca_recurrencia(r public.tarea_recurrencias, d date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when d < r.fecha_inicio then false
    when r.tipo = 'cada_n_dias' then (d - r.fecha_inicio) % r.cada_dias = 0
    when r.tipo = 'dia_mes' then extract(day from d)::int = least(
      r.dia_mes::int,
      extract(day from (date_trunc('month', d) + interval '1 month - 1 day'))::int
    )
    when r.tipo = 'dias_semana' then extract(isodow from d)::smallint = any (r.dias_semana)
    else false
  end;
$$;

-- ─── Generador ───────────────────────────────────────────────────────────────

create or replace function private.generar_tareas_recurrentes(
  hoy date default (now() at time zone 'Europe/Madrid')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.tarea_recurrencias;
  d date;
  nueva uuid;
  total integer := 0;
begin
  for r in select * from public.tarea_recurrencias where activa for update loop
    d := greatest(r.fecha_inicio, coalesce(r.ultima_generacion + 1, r.fecha_inicio), hoy - 30);
    while d <= hoy loop
      if private.toca_recurrencia(r, d) then
        nueva := null;
        insert into public.tareas
          (titulo, descripcion, prioridad, cliente_id, proyecto_id, fecha_limite, recurrencia_id, fecha_programada)
        values
          (r.titulo, r.descripcion, r.prioridad, r.cliente_id, r.proyecto_id, d + r.plazo_dias, r.id, d)
        on conflict (recurrencia_id, fecha_programada) where recurrencia_id is not null do nothing
        returning id into nueva;

        if nueva is not null then
          insert into public.tarea_subtareas (tarea_id, texto, orden)
          select nueva, s.texto, (s.n - 1)::int
          from unnest(r.subtareas) with ordinality as s (texto, n)
          where length(trim(s.texto)) > 0;
          total := total + 1;
        end if;
      end if;
      d := d + 1;
    end loop;

    if r.ultima_generacion is null or r.ultima_generacion < hoy then
      update public.tarea_recurrencias set ultima_generacion = hoy where id = r.id;
    end if;
  end loop;
  return total;
end;
$$;

revoke all on function private.toca_recurrencia(public.tarea_recurrencias, date) from public, anon;
revoke all on function private.generar_tareas_recurrentes(date) from public, anon, authenticated;

-- RPC para el panel: genera al momento al guardar o reanudar una plantilla.
create or replace function public.generar_tareas_recurrentes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'No autorizado';
  end if;
  return private.generar_tareas_recurrentes();
end;
$$;

revoke all on function public.generar_tareas_recurrentes() from public, anon;
grant execute on function public.generar_tareas_recurrentes() to authenticated;

-- ─── Cron diario: 05:00 UTC (06:00 / 07:00 en Madrid) ────────────────────────

create extension if not exists pg_cron;

select cron.unschedule('generar-tareas-recurrentes')
where exists (select 1 from cron.job where jobname = 'generar-tareas-recurrentes');

select cron.schedule(
  'generar-tareas-recurrentes',
  '0 5 * * *',
  $$select private.generar_tareas_recurrentes()$$
);
