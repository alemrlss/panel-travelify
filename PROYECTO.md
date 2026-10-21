# CRM personal Alejandro Morales — Referencia técnica

Planes: `planes/2026-10-20-crm-alejandro-morales-v1.md` (base) y
`planes/2026-10-20-crm-contabilidad.md` (Documentación; su módulo Contabilidad se quitó el 2026-10-21:
Alejandro lleva las facturas en Google Drive — ver `supabase/migrations/0004_quitar_contabilidad.sql`).

Panel interno del negocio propio de Alejandro (no de un cliente): pipeline de ventas, clientes con
sus proyectos y la documentación de los procesos de Travelify. Reutiliza el patrón técnico de
`salidas/crm-tojar-ganivet/` (mismas versiones, `proxy.ts`, cliente GHL, kanban), no su branding.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 3 (+ typography)
- Supabase (Auth + Postgres) — solo lo que GHL no guarda
- GHL API v2 (`services.leadconnectorhq.com`) — sub-cuenta personal `7DYn3mvbvcugA1EMHYsL`,
  pipeline "Marketing Pipeline" `Tn6J4QMZcEtBWqSI96GK`
- `react-markdown` + `remark-gfm` (documentación)
- Íconos `lucide-react` (sin emoji), tipografía Montserrat

## Modelo de datos: híbrido

| Dónde | Qué |
| --- | --- |
| **GHL** (fuente de verdad) | Prospectos, etapas, estado `open/won/lost`, valor, datos de contacto |
| **Supabase** | `team_members`, `clientes` (contacto GHL promovido, por `ghl_contact_id`), `proyectos`, `documentos` |

- Un **cliente** se crea explícitamente: "Convertir en cliente" desde una oportunidad del Pipeline,
  o "Nuevo cliente" buscando un contacto de GHL. Se guarda `nombre_cache` para listar sin pedirle
  a GHL un contacto por fila; email/teléfono se leen en vivo.
- `monetaryValue` de GHL viene en **euros**.
- **Sin módulo de facturación ni contabilidad** (decisión de Alejandro, 2026-10-21): las facturas
  las lleva en Google Drive. El panel no maneja importes salvo el valor de las oportunidades de GHL.

## Métricas

- `lib/metricas.ts`: tasa de cierre = won / (won + lost) del pipeline, últimos 90 días, y valor
  de las oportunidades abiertas.
- Dashboard: clientes activos, proyectos en curso, oportunidades abiertas, valor en pipeline,
  tasa de cierre y documentación reciente. Si GHL falla, el resto carga igual.

## Documentación de Travelify

Tabla `documentos` (Markdown). Categorías fijas: procesos, técnico, ventas, clientes, herramientas,
otros. Búsqueda full-text en español (`tsvector` generado con pesos A=título, B=contenido + GIN,
`textSearch(..., { type: 'websearch', config: 'spanish' })`). El slug se fija al crear y no cambia
al renombrar; `nuevo` está reservado. Render con `react-markdown` + `remark-gfm` **sin
`rehype-raw`**: el HTML escrito se muestra como texto. Editor con vista previa en vivo (lado a lado
en desktop, pestañas en móvil), atajos de formato, Ctrl+S y aviso de cambios sin guardar.

## Estructura

```
app/
  login/                      Login (Supabase Auth)
  (main)/                     Rutas protegidas (requireUser + proxy.ts)
    dashboard/                  Clientes, proyectos, pipeline, tasa de cierre, documentación reciente
    pipeline/                   Kanban GHL (drag & drop desktop, pestañas en mobile)
    pipeline/[opportunityId]/   Detalle + mover etapa + "Convertir en cliente"
    clientes/                   Lista filtrable por estado con nº de proyectos
    clientes/[clientId]/        Ficha: contacto GHL, datos del cliente, proyectos
    documentacion/              Lista por categoría + buscador; [slug]/ ver, [slug]/editar, nuevo/
    configuracion/              Cuenta, cambio de contraseña, estado de conexiones
actions/                      Server Actions (zod + revalidatePath)
lib/
  ghl/                         Cliente server-only de GHL
  supabase/                    Clientes browser/server/admin + tipos (filas como `type`, no
                                `interface`: supabase-js exige Row asignable a Record<string, unknown>;
                                columnas generadas fuera de Insert/Update)
  documentacion.ts, metricas.ts, formato.ts, catalogos.ts, acciones.ts
components/
  ui/                          Primitivos (Button, Card, Badge, Input/Select/Textarea, Dialogo…)
  documentacion/               Editor y render Markdown
  dashboard/                   KpiCard
  form-dialogo.tsx             Botón + diálogo + formulario conectado a una Server Action
supabase/migrations/          0001_init, 0002_contabilidad (revertida por 0004), 0003_documentacion,
                              0004_quitar_contabilidad
supabase/seed.sql             Alta del usuario en team_members
```

## Seguridad

- Toda la app usa la **sesión del usuario + RLS** (`private.is_admin()`, `SECURITY DEFINER`,
  schema `private` no expuesto). La service
  role (`lib/supabase/admin.ts`) solo para setup.
- Rol único `administrador`; `requireUser()` en cada página y Server Action.
- Errores de GHL: detalle en el log del servidor, mensaje genérico en la UI.

## Identidad visual

Marca personal de `salidas/web-alejandro-morales/`: dark mode fijo (`#0A0A0A` / `#111111`), escala
`brand` violeta idéntica a la web, Montserrat, scrollbar violeta, logo "AM." en `public/brand/`.
Favicon propio en `app/icon.svg`. Textos en español neutro (tuteo, sin voseo).

## Fuera de alcance

- Facturación y contabilidad (generar facturas, nube de facturas, IVA): Alejandro las lleva en
  Google Drive. Se construyó y se quitó el 2026-10-21; el diseño está en
  `planes/2026-10-20-crm-contabilidad.md` por si se retoma.
- Imágenes subidas dentro de la documentación (se pueden enlazar por URL)
- Multiusuario
