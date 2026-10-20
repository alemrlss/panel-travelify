'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/input'

/** Cambia un query param (periodo, año, mes…) conservando el resto. */
export function SelectorParam({
  param,
  valor,
  opciones,
  className,
}: {
  param: string
  valor: string
  opciones: { value: string; label: string }[]
  className?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <Select
      value={valor}
      className={className}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set(param, e.target.value)
        router.push(`?${params.toString()}`)
      }}
    >
      {opciones.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  )
}
