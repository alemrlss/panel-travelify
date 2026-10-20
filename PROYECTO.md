# CRM personal Alejandro Morales — Referencia técnica

Planes: `planes/2026-10-20-crm-alejandro-morales-v1.md` (base) y
`planes/2026-10-20-crm-contabilidad.md` (Contabilidad, facturación por cliente, Documentación).

Panel interno del negocio propio de Alejandro (no de un cliente): pipeline de ventas, clientes con
sus proyectos, contabilidad interna (facturas de venta y compra), cuánto factura cada cliente y la
documentación de los procesos de Travelify. Reutiliza el patrón técnico de
`salidas/crm-tojar-ganivet/` (mismas versiones, `proxy.ts`, cliente GHL, kanban), no su branding.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 3 (+ typography)
- Supabase (Auth + Postgres + Storage) — solo lo que GHL no guarda
- GHL API v2 (`services.leadconnectorhq.com`) — sub-cuenta personal `7DYn3mvbvcugA1EMHYsL`,
  pipeline "Marketing Pipeline" `Tn6J4QMZcEtBWqSI96GK`
- `fflate` (ZIP), `react-markdown` + `remark-gfm` (documentación)
- Íconos `lucide-react` (sin emoji), tipografía Montserrat

## Modelo de datos: híbrido

| Dónde | Qué |
| --- | --- |
| **GHL** (fuente de verdad) | Prospectos, etapas, estado `open/won/lost`, valor, datos de contacto |
| **Supabase** | `team_members`, `clientes` (contacto GHL promovido, por `ghl_contact_id`), `proyectos`, `facturas`, `documentos` |
| **Storage** | Bucket privado `facturas` (PDF/JPG/PNG, 10 MB), ruta `{venta\|compra}/{año}/{uuid}.{ext}` |

- Un **cliente** se crea explícitamente: "Convertir en cliente" desde una oportunidad del Pipeline,
  o "Nuevo cliente" buscando un contacto de GHL. Se guarda `nombre_cache` para listar sin pedirle
  a GHL un contacto por fila; email/teléfono se leen en vivo.
- **Contabilidad es un registro interno**: el panel no emite facturas ni genera nada automático
  (decisión explícita de Alejandro). Una sola tabla `facturas` con `tipo in ('venta','compra')`.
  - Se introduce el **total** (lo que se paga/cobra de verdad). `base_cents`, `iva_cents` e
    `irpf_cents` son **columnas generadas**: `base = round(total / (1 + (iva − irpf)/100))`.
    `lib/impuestos.ts` replica la fórmula solo para la vista previa del formulario.
  - IVA 21/10/4/0 (21 por defecto), IRPF 0/7/15/19 (0 por defecto).
  - Estado `pendiente | pagada` + `fecha_pago` ("Cobrada" en ventas, "Pagada" en compras).
  - `contraparte` (texto) siempre; `cliente_id` opcional solo en ventas, `on delete set null`
    (borrar un cliente no borra su contabilidad).
  - Número único en ventas (índice parcial); se sugiere `AAAA-NNN` sin imponerlo.
  - El PDF se sube **desde el navegador** a Storage con la sesión del usuario (las Server Actions
    limitan el cuerpo a 1 MB). Si guardar falla, se descarta el archivo. Al reemplazar o borrar
    se elimina el anterior. Se ve con Signed URL de 5 minutos.
- **Facturación por cliente** (`lib/facturacion-clientes.ts`) sale solo de sus facturas de venta
  (`total_cents`, con los descuentos ya aplicados). `clientes.cuota_referencia_cents` es
  **informativa**: se muestra al lado con la diferencia, no entra en ningún cálculo. Media mensual
  = facturado en 12 meses ÷ meses con el cliente dentro de esa ventana (mínimo 1).
- `monetaryValue` de GHL viene en **euros**; todo lo de Supabase en **céntimos**.

## Métricas

- `lib/contabilidad.ts`: ingresos, gastos y beneficio sobre la **base imponible**, imputados por
  **fecha de factura** (devengo). Resumen trimestral: IVA repercutido − soportado e IRPF retenido
  (orientativo para 303/130). Serie de 6 meses para el Dashboard.
- `lib/metricas.ts`: tasa de cierre = won / (won + lost) del pipeline, últimos 90 días.
- Se agregan en JS (volumen de negocio unipersonal); si GHL falla, el Dashboard carga igual.

## Exportación (`/contabilidad/exportar?mes=YYYY-MM`)

Route Handler con sesión: ZIP con `ventas.csv`, `compras.csv` (separador `;`, BOM UTF-8, decimales
con coma → Excel es-ES) y los adjuntos en `ventas/` y `compras/` como
`{fecha}_{numero}_{contraparte}.{ext}`. Si un adjunto falla, se añade `ERRORES.txt`.

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
    dashboard/                  Ingresos/gastos/beneficio del mes, gráfico 6 meses, tasa de cierre,
                                facturación por cliente, pendientes de cobro, proyectos en curso
    pipeline/                   Kanban GHL (drag & drop desktop, pestañas en mobile)
    pipeline/[opportunityId]/   Detalle + mover etapa + "Convertir en cliente"
    clientes/                   Lista con facturado este mes / media / 12 meses / pendiente
    clientes/[clientId]/        Ficha: contacto GHL, datos + cuota de referencia, facturas, proyectos
    contabilidad/               Ventas / Compras / Resumen (trimestral + exportar), filtro de periodo
    contabilidad/exportar/      GET → ZIP mensual para la gestoría
    documentacion/              Lista por categoría + buscador; [slug]/ ver, [slug]/editar, nuevo/
    configuracion/              Cuenta, cambio de contraseña, estado de conexiones
actions/                      Server Actions (zod + revalidatePath)
lib/
  ghl/                         Cliente server-only de GHL
  supabase/                    Clientes browser/server/admin + tipos (filas como `type`, no
                                `interface`: supabase-js exige Row asignable a Record<string, unknown>;
                                columnas generadas fuera de Insert/Update)
  contabilidad.ts, facturacion-clientes.ts, impuestos.ts, csv.ts, documentacion.ts,
  metricas.ts, formato.ts, catalogos.ts, acciones.ts
components/
  ui/                          Primitivos (Button, Card, Badge, Input/Select/Textarea, Dialogo…)
  contabilidad/                Formulario de factura (subida a Storage), lista, resumen, exportar
  documentacion/               Editor y render Markdown
  dashboard/                   KpiCard, barras ingresos/gastos, facturación por cliente
  form-dialogo.tsx             Botón + diálogo + formulario conectado a una Server Action
supabase/migrations/          0001_init.sql, 0002_contabilidad.sql, 0003_documentacion.sql
supabase/seed.sql             Alta del usuario en team_members
```

## Seguridad

- Toda la app usa la **sesión del usuario + RLS** (`private.is_admin()`, `SECURITY DEFINER`,
  schema `private` no expuesto), también en `storage.objects` del bucket `facturas`. La service
  role (`lib/supabase/admin.ts`) solo para setup.
- Rol único `administrador`; `requireUser()` en cada página, Server Action y Route Handler.
- Errores de GHL: detalle en el log del servidor, mensaje genérico en la UI.

## Identidad visual

Marca personal de `salidas/web-alejandro-morales/`: dark mode fijo (`#0A0A0A` / `#111111`), escala
`brand` violeta idéntica a la web, Montserrat, scrollbar violeta, logo "AM." en `public/brand/`.
Favicon propio en `app/icon.svg`. Gráfico de 2 series: `#8B5CF6` (ingresos) + `#0F9F8F` (gastos),
validado con el skill dataviz en modo oscuro (no reutiliza ámbar/rojo, que son de estado).
Textos en español neutro (tuteo, sin voseo).

## Fuera de alcance

- Emitir facturas o generar cobros automáticos (descartado por Alejandro)
- Categorías de gasto, proveedores con NIF, vencimientos, OCR de facturas, leer GHL Payments
- Imágenes subidas dentro de la documentación (se pueden enlazar por URL)
- Multiusuario
