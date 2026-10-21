# CRM · Alejandro Morales

Panel personal: pipeline de ventas (GHL), clientes y proyectos, documentación de Travelify y métricas.
Referencia técnica completa en [`PROYECTO.md`](./PROYECTO.md).

## Setup

1. **Supabase**: proyecto dedicado (no reutilizar el de otros CRMs). Ejecutar en el SQL Editor,
   en orden las migraciones de `supabase/migrations/` (0001 → 0004). En una base nueva, 0002 y 0004
   se anulan entre sí (0004 quita Contabilidad); si existe el bucket `facturas`, borrarlo desde Storage.
2. **Usuario**: crear el usuario en Auth (email + contraseña, email confirmado) e insertar su fila:
   ```sql
   insert into public.team_members (id, email, full_name)
   values ('<uuid de auth.users>', 'alejandroaml0528@gmail.com', 'Alejandro Morales');
   ```
3. **`.env`** (ver `.env.example`): 3 variables de Supabase + `GHL_LOCATION_ID`,
   `GHL_PRIVATE_TOKEN`, `GHL_PIPELINE_ID`.
4. `npm install` y `npm run dev` (comprobar antes que no haya otro `next dev` en esta carpeta).

## Deploy (Vercel)

- Cargar las 6 variables de entorno en Production y Preview.
- Dominio: `panel.travelify.es` (CNAME a Vercel).
- En Supabase → Authentication → URL Configuration, añadir la URL de producción.
