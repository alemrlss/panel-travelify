# CRM personal Alejandro Morales — Referencia técnica

Plan de origen: `planes/2026-10-20-crm-alejandro-morales-v1.md`.

Panel interno del negocio propio de Alejandro (no de un cliente): pipeline de ventas, clientes con
sus proyectos, lo que cobra cada uno y las métricas del negocio. Reutiliza el patrón técnico de
`salidas/crm-tojar-ganivet/` (mismas versiones, `proxy.ts`, cliente GHL, kanban), no su branding.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 3
- Supabase (Auth + Postgres) — solo lo que GHL no guarda
- GHL API v2 (`services.leadconnectorhq.com`) — sub-cuenta personal `7DYn3mvbvcugA1EMHYsL`,
  pipeline "Marketing Pipeline" `Tn6J4QMZcEtBWqSI96GK`
- Íconos `lucide-react` (sin emoji), tipografía Montserrat

## Modelo de datos: híbrido

| Dónde | Qué |
| --- | --- |
| **GHL** (fuente de verdad) | Prospectos, etapas, estado `open/won/lost`, valor, datos de contacto |
| **Supabase** | `team_members` (usuario del panel), `clientes` (contacto GHL promovido, por `ghl_contact_id`), `proyectos`, `servicios_contratados`, `pagos` |

- Un **cliente** se crea explícitamente: "Convertir en cliente" desde una oportunidad del Pipeline,
  o "Nuevo cliente" buscando un contacto de GHL. Se guarda `nombre_cache` para listar sin pedirle
  a GHL un contacto por fila; email/teléfono se leen en vivo.
- **Facturación es un registro interno**, no emite facturas. Importes en céntimos (`integer`),
  EUR. Un servicio `unico` crea su pago pendiente al darse de alta; los `recurrente_mensual` se
  generan con "Generar cobros del mes" (idempotente por `unique (servicio_id, periodo)`).
  "Vencido" no se guarda: es `pendiente` con `fecha_vencimiento < hoy` (`lib/metricas.ts`).
- `monetaryValue` de GHL viene en **euros**; todo lo de Supabase en **céntimos**.

## Métricas (`lib/metricas.ts`)

- Recurrente mensual = suma de servicios mensuales activos y vigentes hoy
- Cobrado este mes = pagos `pagado` con `fecha_pago` en el mes
- Pendiente / vencido = pagos `pendiente` (vencido si `fecha_vencimiento < hoy`)
- Tasa de cierre = won / (won + lost) del pipeline, oportunidades tocadas en los últimos 90 días
- Se agregan en JS (volumen de negocio unipersonal); si GHL falla, el Dashboard carga igual

## Estructura

```
app/
  login/                      Login (Supabase Auth)
  (main)/                     Rutas protegidas (requireUser + proxy.ts)
    dashboard/                  KPIs, cobrado por mes, tasa de cierre, próximos cobros, proyectos
    pipeline/                   Kanban GHL (drag & drop desktop, pestañas en mobile)
    pipeline/[opportunityId]/   Detalle + mover etapa + "Convertir en cliente"
    clientes/                   Lista filtrable por estado + "Nuevo cliente"
    clientes/[clientId]/        Ficha: contacto GHL, datos, proyectos, lo que cobra, cobros
    facturacion/                Pendientes / pagados / mensuales + generar cobros del mes
    configuracion/              Cuenta, cambio de contraseña, estado de conexiones
actions/                      Server Actions (zod + revalidatePath('/', 'layout'))
lib/
  ghl/                         Cliente server-only de GHL
  supabase/                    Clientes browser/server/admin + tipos (filas como `type`, no
                                `interface`: supabase-js exige Row asignable a Record<string, unknown>)
  metricas.ts, formato.ts, catalogos.ts, acciones.ts
components/
  ui/                          Primitivos (Button, Card, Badge, Input/Select/Textarea, Dialogo…)
  form-dialogo.tsx             Botón + diálogo + formulario conectado a una Server Action
  campos.tsx                   Grupos de campos de proyecto, servicio, pago, marcar pagado
supabase/migrations/          0001_init.sql
```

## Seguridad

- Toda la app usa la **sesión del usuario + RLS** (`private.is_admin()`, `SECURITY DEFINER`,
  schema `private` no expuesto). La service role (`lib/supabase/admin.ts`) solo para setup.
- Rol único `administrador`; `requireUser()` en cada página y Server Action.
- Errores de GHL: detalle en el log del servidor, mensaje genérico en la UI.

## Identidad visual

Marca personal de `salidas/web-alejandro-morales/`: dark mode fijo (`#0A0A0A` / `#111111`), escala
`brand` violeta idéntica a la web, Montserrat, scrollbar violeta, logo "AM." en `public/brand/`.
Favicon propio en `app/icon.svg`. Textos en español neutro (tuteo, sin voseo).

## Fuera de alcance de v1

- Leer facturas/pagos de GHL Payments (campo `pagos.ghl_invoice_id` reservado)
- Cron automático de cobros y avisos de vencidos
- Multiusuario
