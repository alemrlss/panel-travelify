import { clsx } from '@/lib/clsx'

export function KpiCard({
  icon,
  label,
  valor,
  detalle,
  alerta = false,
}: {
  icon: React.ReactNode
  label: string
  valor: string
  detalle?: React.ReactNode
  alerta?: boolean
}) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft',
        alerta ? 'border-red-500/30' : 'border-hairline/[0.07]'
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-ink/50">
        <span
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-lg',
            alerta ? 'bg-red-500/15 text-red-300' : 'bg-brand-500/15 text-brand-300'
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <p className="tabular mt-3 text-[26px] font-bold leading-none tracking-tight text-ink">
        {valor}
      </p>
      {detalle && <div className="mt-2 text-xs text-ink/45">{detalle}</div>}
    </div>
  )
}
