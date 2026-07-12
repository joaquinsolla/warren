import * as React from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function BackButton() {
  const navigate = useNavigate()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className="-ml-2 mb-4"
    >
      <ArrowLeftIcon className="size-4" />
      Volver
    </Button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm tabular-nums">{children}</dd>
    </div>
  )
}

export function NotFound({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
      {message}
    </div>
  )
}

/** Muestra una lista por páginas: `step` elementos y un botón para cargar más. */
export function useLoadMore<T>(items: T[], step = 5) {
  const [count, setCount] = React.useState(step)
  const visible = items.slice(0, count)
  const remaining = Math.max(items.length - count, 0)
  return {
    visible,
    hasMore: remaining > 0,
    remaining,
    showMore: () => setCount((c) => c + step),
  }
}

export function LoadMoreButton({
  remaining,
  onClick,
}: {
  remaining: number
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground w-full"
    >
      Cargar más ({remaining})
    </Button>
  )
}
