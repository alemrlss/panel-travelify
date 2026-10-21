-- Quita Contabilidad entera (2026-10-21): Alejandro sigue llevando las facturas en
-- Google Drive. Revierte lo de 0002_contabilidad.sql. La tabla estaba vacía.
-- El bucket de Storage "facturas" se borra aparte por la API de Storage (no se
-- puede borrar desde SQL); aquí solo se quitan sus políticas.

drop policy if exists "facturas storage: administrador lee" on storage.objects;
drop policy if exists "facturas storage: administrador sube" on storage.objects;
drop policy if exists "facturas storage: administrador actualiza" on storage.objects;
drop policy if exists "facturas storage: administrador borra" on storage.objects;

drop table if exists public.facturas;

alter table public.clientes drop column if exists cuota_referencia_cents;
