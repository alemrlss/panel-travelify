-- Contratos firmados por cliente (2026-10-21): archivos en Storage privado +
-- una fila por archivo con sus metadatos. El archivo se sube desde el navegador
-- con la sesión del usuario (las Server Actions limitan el cuerpo a 1 MB).

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nombre text not null,            -- nombre original del archivo
  archivo_path text not null unique,
  mime text not null,
  tamano_bytes bigint not null check (tamano_bytes >= 0),
  created_at timestamptz not null default now()
);

create index contratos_cliente_id_idx on public.contratos (cliente_id, created_at desc);

alter table public.contratos enable row level security;

create policy "contratos: administrador acceso total"
  on public.contratos for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Bucket privado: PDF, Word e imágenes, 20 MB. Ruta: {cliente_id}/{uuid}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos', 'contratos', false, 20971520, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
])
on conflict (id) do nothing;

create policy "contratos storage: administrador lee"
  on storage.objects for select to authenticated
  using (bucket_id = 'contratos' and (select private.is_admin()));

create policy "contratos storage: administrador sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'contratos' and (select private.is_admin()));

create policy "contratos storage: administrador borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'contratos' and (select private.is_admin()));
