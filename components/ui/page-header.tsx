export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300/80">
          <span className="h-px w-6 bg-brand-500" />
          {eyebrow}
        </p>
        <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          {title}
        </h1>
      </div>
      {action}
    </div>
  )
}
