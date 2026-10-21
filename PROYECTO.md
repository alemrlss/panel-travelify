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
| **Supabase** | `team_members`, `clientes` (datos propios; vínculo opcional al contacto/oportunidad de GHL), `proyectos` (en la UI: "Servicios contratados"), `contratos`, `documentos` |
| **Storage** | Bucket privado `contratos` (PDF, Word, JPG, PNG; 20 MB), ruta `{cliente_id}/{uuid}.{ext}` |

- **Ciclo del cliente:** el lead avanza por el pipeline de GHL. En el detalle de la oportunidad,
  "Convertir en cliente" (`convertirEnCliente`) abre un formulario con los datos del lead
  prerrellenados; al confirmar crea el cliente en Supabase y deja la oportunidad **Ganada** en GHL
  (`marcarOportunidadGanada`: `status: won` + etapa "Ganado…"). Si GHL falla, el alta se deshace.
  También hay alta manual ("Nuevo cliente"). A partir de ahí el cliente vive en el módulo Clientes.
- El cliente tiene **datos propios** en Supabase: `empresa` (obligatoria), `responsable`,
  `telefono`, `email` (migración 0005). Ya no se leen de GHL en vivo. `ghl_contact_id` y
  `ghl_opportunity_id` son opcionales (null en altas manuales).
- **Servicios contratados** = tabla `proyectos` (en la UI se renombró). Cada uno: nombre, tipo,
  `importe_cents` (lo que se cobra de verdad, con descuento), `cobro` (mensual/trimestral/anual/único),
  `fecha_inicio`, enlace, notas. **Estados según el cobro** (`lib/servicios.ts`, migración 0009):
  - Recurrente: `en_curso` → `baja` ("De baja"), reactivable. Sin fecha de fin.
  - Pago único: `planificado` → `en_curso` → `en_revision` → `entregado` (o `baja` = "Cancelado").
  - `estado_desde` = fecha real del estado actual; cada cambio va por `cambiarEstadoServicio` (fecha +
    motivo) y queda en el historial. Sin "entrega prevista" (decisión de Alejandro).
- **Dinero del cliente** (resumen de la ficha): recurrente mensual = recurrentes en curso (trimestral
  ÷ 3, anual ÷ 12); valor anual = × 12; pagos únicos = **entregados** (+ "en marcha" los no entregados
  ni cancelados); antigüedad desde `cliente_desde`. En la lista y el Dashboard, solo
  clientes activos.
- **Historial** (`cliente_eventos`, migración 0008): alta, vinculación, baja/reactivación, servicios
  (alta, cambio de precio/nombre/tipo, estado, eliminado), contratos (alta con validez, baja,
  eliminado) y notas manuales. Se escribe desde las Server Actions (`lib/eventos.ts`); un fallo
  al apuntar no rompe la acción.
- **Vincular con el pipeline** (`vincularOportunidad`): cliente creado a mano → elegir su
  oportunidad abierta → queda Ganada en GHL y se guardan los ids.
- **Contratos firmados** por cliente: el archivo se sube desde el navegador a Storage con la sesión
  (las Server Actions limitan a 1 MB) y `registrarContrato` guarda la fila; si falla, borra el
  archivo. Al subir se exige validez (`fecha_inicio`–`fecha_fin`); estado visible Vigente / Vence en N
  días (≤30) / Vencido / De baja (`darDeBajaContrato` con fecha y motivo). Ver/descargar con Signed URL
  de 5 min (la descarga usa el nombre original). Al eliminar
  un cliente se borran antes sus archivos (la cascada de la tabla no toca Storage).
- **Dar de baja / Reactivar** desde la cabecera de la ficha (`setEstadoCliente`): "De baja" es el
  estado `finalizado`; conserva datos y contratos.
- `monetaryValue` de GHL viene en **euros**.
- **Sin módulo de facturación ni contabilidad** (decisión de Alejandro, 2026-10-21): las facturas
  las lleva en Google Drive. Los únicos importes son el precio de cada servicio contratado y el
  valor de las oportunidades de GHL.

## Métricas (Dashboard)

`lib/metricas.ts` → `getResumenPipeline()`: una sola lectura del pipeline de GHL. Calcula:

- Oportunidades abiertas y valor en pipeline.
- Tasa de cierre: won / (won + lost) de los últimos 90 días, por `lastStatusChangeAt`.
- Embudo: abiertas por etapa, con nº y valor.
- Este mes: oportunidades nuevas (`createdAt`), ganadas y perdidas (`lastStatusChangeAt`), y valor ganado.
- Sin movimiento: abiertas que pasaron el **plazo de su etapa** sin cambiar (`lastStageChangeAt`).
  `PLAZOS_POR_ETAPA` reconoce la etapa por el nombre: nuevo lead/prospecto 2 días, contactando 3,
  no asistió 0 (avisa siempre: hay que reactivarle), cita 7, negociación/seguimiento/propuesta 7; el
  resto, 14. Ordenadas por cuánto se pasaron del plazo.
- Por qué se pierden: motivos de `oportunidades_perdidas` de los últimos 90 días.

**Perdidas con motivo** (migración 0010): en el panel del lead, "Perdida" guarda el motivo
(precio, no es el momento, eligió a otro, dejó de responder, no encaja, otro) + detalle en
`oportunidades_perdidas` y pone `status: lost` en GHL (si GHL falla, se borra el motivo). "Reabrir"
vuelve a `open` y borra el motivo. El **valor** de la oportunidad (`monetaryValue`, euros) se edita
desde el panel del lead. Proceso comercial de Alejandro (etapas que renombra él en GHL):
Nuevo lead → Contactando → Cita Agendada → No Asistió → Negociación →
Ganado / Onboarding; "perdido" es status, no etapa.

**Panel lateral del lead**: clic en cualquier tarjeta del pipeline → panel desde la derecha
(`components/pipeline/panel-lead.tsx`, `<dialog>` nativo; Escape o clic fuera cierran). Carga todo con
`getDetalleLead` (`actions/leads.ts`): acciones rápidas (llamar, WhatsApp, email), etapa (se cambia
desde ahí si está abierta), **notas internas**, motivo si se perdió, datos del lead y, si ya es
cliente, su resumen y enlace a la ficha. Si GHL no tiene teléfono/email/empresa, se usan los de la
ficha de cliente. **Es la única ficha del lead** (decisión de Alejandro, 2026-10-21: "que esa pantalla
del panel sea la ficha completa"): también lleva "Convertir en cliente", "Perdida" con motivo, editar
motivo, "Reabrir" y editar el valor. Se abre desde un enlace con `/pipeline?lead=ID` (Dashboard,
ficha de cliente); `/pipeline/[id]` solo redirige ahí. El `onClose` del panel ignora el de los
diálogos de dentro (React lo propaga).

**Notas internas** (`lead_notas`, migración 0011): van **por contacto de GHL**, no por oportunidad,
así siguen con el lead si tiene otra oportunidad o se hace cliente. Se guardan en Supabase (no en
las notas de GHL). Componente `components/pipeline/notas-lead.tsx` (Ctrl + Enter guarda).

**Lo perdido no se borra nunca** (pedido de Alejandro: "que quede todo siempre en el CRM"). El
pipeline tiene filtro Abiertas (por defecto) / Ganadas / Perdidas / Todas (`?ver=`); cada oportunidad
sigue en la etapa donde se cerró y solo las abiertas se arrastran. Las perdidas muestran su motivo en
la tarjeta. Si se marcó perdida fuera del panel, la ficha avisa y permite "Apuntar motivo" (y luego
"Editar motivo"): `marcarPerdida` no toca GHL si ya estaba `lost` y conserva fecha y etapa.

De Supabase salen los clientes activos y los nuevos del mes. Si GHL falla, las cifras de clientes cargan igual. A pedido de Alejandro, el Dashboard no muestra proyectos ni documentación.

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
    dashboard/                  KPIs, embudo del pipeline, este mes, oportunidades sin movimiento
    pipeline/                   Kanban GHL (drag & drop desktop, pestañas en mobile)
    pipeline/[opportunityId]/   Solo redirige a /pipeline?lead=ID (la ficha del lead es el panel lateral)
    clientes/                   Lista filtrable por estado con nº de proyectos
    clientes/[clientId]/        Ficha: contacto, edición, dar de baja, contratos firmados, servicios contratados
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
  dashboard/                   KpiCard, Embudo
  form-dialogo.tsx             Botón + diálogo + formulario conectado a una Server Action
supabase/migrations/          0001_init, 0002_contabilidad (revertida por 0004), 0003_documentacion,
                              0004_quitar_contabilidad, 0005_clientes_datos_propios, 0006_contratos,
                              0007_servicios_cobro, 0008_historial_contratos_estados,
                              0009_estados_por_tipo_de_cobro, 0010_oportunidades_perdidas,
                              0011_lead_notas
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
