-- Contabilidad: reemplaza servicios_contratados + pagos (vacías al migrar, 2026-10-20).
-- Registro interno de facturas emitidas (venta) y recibidas (compra); el panel no
-- emite ni genera nada automático. Plan: planes/2026-10-20-crm-contabilidad.md

drop table if exists public.pagos;
drop table if exists public.servicios_contratados;

-- Solo informativa: "lo que cobraría sin descuento". No entra en ningún cálculo.
alter table public.clientes
  add column if not exists cuota_referencia_cents integer check (cuota_referencia_cents >= 0);

-- Se introduce el TOTAL de la factura (lo que realmente se paga/cobra):
--   total = base + base·IVA% − base·IRPF%   →   base = total / (1 + (IVA − IRPF)/100)
-- base/iva/irpf son columnas generadas: nunca se desincronizan del total.
-- Comprobación: 1210 € IVA 21 → base 1000, IVA 210 · 1060 € IVA 21 IRPF 15 → base 1000,
-- IVA 210, IRPF 150 · 0 € → 0.
create table public.facturas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('venta', 'compra')),
  numero text not null,
  fecha date not null,
  cliente_id uuid references public.clientes (id) on delete set null,
  proyecto_id uuid references public.proyectos (id) on delete set null,
  -- Cliente (venta) o proveedor (compra). Se conserva aunque se borre el cliente.
  contraparte text not null,
  concepto text not null,
  total_cents integer not null check (total_cents >= 0),
  iva_pct numeric(4, 2) not null default 21 check (iva_pct in (0, 4, 10, 21)),
  irpf_pct numeric(4, 2) not null default 0 check (irpf_pct in (0, 7, 15, 19)),
  base_cents integer generated always as (
    round(total_cents / (1 + (iva_pct - irpf_pct) / 100))::integer
  ) stored,
  iva_cents integer generated always as (
    round(round(total_cents / (1 + (iva_pct - irpf_pct) / 100)) * iva_pct / 100)::integer
  ) stored,
  irpf_cents integer generated always as (
    round(round(total_cents / (1 + (iva_pct - irpf_pct) / 100)) * irpf_pct / 100)::integer
  ) stored,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagada')),
  fecha_pago date,
  pdf_path text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facturas_fecha_pago check (estado = 'pendiente' or fecha_pago is not null),
  constraint facturas_cliente_solo_venta check (tipo = 'venta' or cliente_id is null)
);

-- El número es único en las ventas (las emite Alejandro); en compras es el del proveedor.
create unique index facturas_numero_venta_unique on public.facturas (numero) where tipo = 'venta';
create index facturas_tipo_fecha_idx on public.facturas (tipo, fecha);
create index facturas_cliente_id_idx on public.facturas (cliente_id);
create index facturas_proyecto_id_idx on public.facturas (proyecto_id);
create index facturas_pendientes_idx on public.facturas (tipo, fecha) where estado = 'pendiente';

create trigger facturas_updated_at before update on public.facturas
  for each row execute function private.set_updated_at();

alter table public.facturas enable row level security;

create policy "facturas: administrador acceso total"
  on public.facturas for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ─── Storage: PDF de las facturas (bucket privado, 10 MB, PDF/JPG/PNG) ────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas', 'facturas', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "facturas storage: administrador lee"
  on storage.objects for select to authenticated
  using (bucket_id = 'facturas' and (select private.is_admin()));

create policy "facturas storage: administrador sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas' and (select private.is_admin()));

create policy "facturas storage: administrador actualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'facturas' and (select private.is_admin()));

create policy "facturas storage: administrador borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'facturas' and (select private.is_admin()));
