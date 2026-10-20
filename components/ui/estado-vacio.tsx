export function EstadoVacio({
  icon,
  titulo,
  texto,
  action,
}: {
  icon: React.ReactNode
  titulo: string
  texto?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-hairline/10 px-6 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-brand-300">
        {icon}
      </span>
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-xs text-ink/45">{texto}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
