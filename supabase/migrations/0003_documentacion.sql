-- Documentación de Travelify: wiki en Markdown con búsqueda full-text en español.

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  -- Se fija al crear y no cambia al renombrar, para no romper enlaces.
  slug text not null unique,
  titulo text not null,
  categoria text not null default 'procesos' check (categoria in (
    'procesos', 'tecnico', 'ventas', 'clientes', 'herramientas', 'otros'
  )),
  contenido text not null default '',
  fijado boolean not null default false,
  busqueda tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(contenido, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documentos_busqueda_idx on public.documentos using gin (busqueda);
create index documentos_categoria_idx on public.documentos (categoria, updated_at desc);

create trigger documentos_updated_at before update on public.documentos
  for each row execute function private.set_updated_at();

alter table public.documentos enable row level security;

create policy "documentos: administrador acceso total"
  on public.documentos for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
