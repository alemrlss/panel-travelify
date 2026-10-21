-- Estados según el tipo de servicio (2026-10-21):
--   recurrente (mensual/trimestral/anual): en_curso → baja
--   pago único: planificado → en_curso → en_revision → entregado (o baja = cancelado)
-- Un pago único cuenta como dinero cuando está entregado. Sin fecha de entrega
-- prevista: cada cambio guarda su fecha real (estado_desde + historial).

alter table public.proyectos drop constraint if exists proyectos_estado_check;
update public.proyectos set estado = 'baja' where estado = 'cancelado';
alter table public.proyectos add constraint proyectos_estado_check
  check (estado in ('planificado', 'en_curso', 'en_revision', 'entregado', 'baja'));

-- Un recurrente solo puede estar en curso o de baja.
update public.proyectos set estado = 'en_curso'
  where cobro <> 'unico' and estado not in ('en_curso', 'baja');
alter table public.proyectos add constraint proyectos_estado_segun_cobro
  check (cobro = 'unico' or estado in ('en_curso', 'baja'));

alter table public.proyectos drop column if exists fecha_entrega;
