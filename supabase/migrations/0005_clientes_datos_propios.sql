-- Clientes con datos propios (2026-10-21). El cliente nace en este panel: al
-- convertir un lead del pipeline (la oportunidad queda Ganada en GHL) o creado a
-- mano. Sus datos ya no se leen de GHL en vivo: viven aquí.
-- Tabla vacía al migrar.

alter table public.clientes rename column nombre_cache to empresa;

alter table public.clientes
  add column if not exists responsable text,
  add column if not exists telefono text,
  add column if not exists email text;

-- Un cliente creado a mano no tiene contacto en GHL. El unique se mantiene
-- (varios null están permitidos): un contacto de GHL = como mucho un cliente.
alter table public.clientes alter column ghl_contact_id drop not null;

alter table public.clientes
  add constraint clientes_empresa_no_vacia check (length(trim(empresa)) > 0);
