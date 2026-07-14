import * as React from 'react'
import { BanIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ColorPickerProps = {
  value: string | null
  onChange: (color: string | null) => void
}

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function normalizeHex(input: string): string | null {
  const value = input.trim()
  const withHash = value.startsWith('#') ? value : `#${value}`
  return HEX_REGEX.test(withHash) ? withHash.toUpperCase() : null
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hexText, setHexText] = React.useState(value ?? '')

  React.useEffect(() => {
    setHexText(value ?? '')
  }, [value])

  const hexInvalid = hexText.trim().length > 0 && normalizeHex(hexText) === null

  function commitHex(raw: string) {
    setHexText(raw)
    if (raw.trim() === '') {
      onChange(null)
      return
    }
    const normalized = normalizeHex(raw)
    if (normalized) onChange(normalized)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Sin color"
          aria-pressed={value === null}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform hover:scale-110',
            value === null &&
              'ring-ring ring-2 ring-offset-2 ring-offset-background',
          )}
        >
          <BanIcon className="text-muted-foreground size-4" />
        </button>

        <label
          className={cn(
            'relative flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border transition-transform hover:scale-110',
            value !== null &&
              'ring-ring ring-2 ring-offset-2 ring-offset-background',
          )}
          style={value !== null ? { backgroundColor: value } : undefined}
          aria-label="Selector de color"
        >
          {value === null && (
            <span
              className="size-full"
              style={{
                background:
                  'conic-gradient(from 0deg, #ff375f, #ff9f0a, #ffd60a, #30d158, #0a84ff, #5e5ce6, #bf5af2, #ff375f)',
              }}
            />
          )}
          <input
            type="color"
            value={value ?? '#00c46f'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <input
          type="text"
          value={hexText}
          onChange={(e) => commitHex(e.target.value)}
          placeholder="#00C46F"
          spellCheck={false}
          maxLength={7}
          aria-invalid={hexInvalid}
          className={cn(
            'border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-28 rounded-md border bg-transparent px-2 font-mono text-sm uppercase shadow-xs outline-none focus-visible:ring-[3px]',
            hexInvalid &&
              'border-destructive focus-visible:ring-destructive/20',
          )}
        />
      </div>
      {hexInvalid && (
        <p className="text-destructive text-xs">Código hex no válido.</p>
      )}
    </div>
  )
}
