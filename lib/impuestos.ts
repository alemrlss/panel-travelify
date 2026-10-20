// Sin server-only: lo usa también el formulario para la vista previa del desglose.

export const IVA_OPCIONES = [21, 10, 4, 0] as const
export const IRPF_OPCIONES = [0, 7, 15, 19] as const

/**
 * Misma fórmula que las columnas generadas de public.facturas
 * (supabase/migrations/0002_contabilidad.sql): se introduce el total final
 * (base + IVA − IRPF) y de ahí salen base, IVA e IRPF. Math.round coincide con
 * el round() de Postgres para importes positivos.
 */
export function desglosar(totalCents: number, ivaPct: number, irpfPct: number) {
  const base = Math.round(totalCents / (1 + (ivaPct - irpfPct) / 100))
  return {
    base,
    iva: Math.round((base * ivaPct) / 100),
    irpf: Math.round((base * irpfPct) / 100),
  }
}
