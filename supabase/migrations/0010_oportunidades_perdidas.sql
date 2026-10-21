-- Motivo por el que se pierde una oportunidad (2026-10-21).
-- GHL guarda el status "lost"; aquí queda el porqué, para ver en qué se pierden las ventas.
-- Una fila por oportunidad: si se reabre, se borra.

create table public.oportunidades_perdidas (
  ghl_opportunity_id text primary key,
  nombre text not null,
  etapa text,  -- etapa en la que estaba al perderse
  motivo text not null check (motivo in (
    'precio', 'no_es_el_momento', 'eligio_a_otro', 'no_responde', 'no_encaja', 'otro'
  )),
  detalle text,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create index oportunidades_perdidas_fecha_idx on public.oportunidades_perdidas (fecha desc);

alter table public.oportunidades_perdidas enable row level security;

create policy "oportunidades_perdidas: administrador acceso total"
  on public.oportunidades_perdidas for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
