import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

type DateInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'onChange'
> & {
  value: string
  onChange: (value: string) => void
}

/**
 * Input de fecha con botón para borrar el valor. El date picker nativo no
 * siempre deja limpiar la fecha de forma sencilla, así que añadimos una «×».
 */
function DateInput({
  value,
  onChange,
  disabled,
  className,
  ...props
}: DateInputProps) {
  return (
    <div className="relative">
      <Input
        {...props}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          '[&::-webkit-calendar-picker-indicator]:hidden pr-9',
          className,
        )}
      />
      {!disabled && (
        <button
          type="button"
          aria-label="Borrar fecha"
          onClick={() => onChange('')}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 transition-colors"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  )
}

export { DateInput }
