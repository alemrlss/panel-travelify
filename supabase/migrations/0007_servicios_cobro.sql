-- Servicios contratados con lo que se cobra (2026-10-21). La tabla sigue siendo
-- "proyectos" (en la UI: "Servicios contratados"). El importe es lo que se cobra
-- de verdad, con el descuento ya aplicado si lo hay.

alter table public.proyectos
  add column if not exists importe_cents integer check (importe_cents >= 0),
  add column if not exists cobro text not null default 'unico'
    check (cobro in ('mensual', 'trimestral', 'anual', 'unico'));

-- Nuevo tipo de servicio: mantenimiento web.
alter table public.proyectos drop constraint if exists proyectos_tipo_check;
alter table public.proyectos add constraint proyectos_tipo_check check (tipo in (
  'agente_whatsapp', 'agente_llamadas', 'agente_web', 'web', 'mantenimiento_web', 'seo_geo',
  'redes', 'publicidad', 'email_marketing', 'crm_automatizaciones', 'reputacion',
  'reactivacion', 'otro'
));
