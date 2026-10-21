-- Notas internas de los leads del pipeline (2026-10-21).
-- Van por contacto de GHL (no por oportunidad): si el lead tiene otra oportunidad
-- o se convierte en cliente, sus notas siguen con él.

create table public.lead_notas (
  id uuid primary key default gen_random_uuid(),
  ghl_contact_id text not null,
  ghl_opportunity_id text,  -- oportunidad desde la que se escribió
  texto text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now()
);

create index lead_notas_contacto_idx on public.lead_notas (ghl_contact_id, created_at desc);

alter table public.lead_notas enable row level security;

create policy "lead_notas: administrador acceso total"
  on public.lead_notas for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
