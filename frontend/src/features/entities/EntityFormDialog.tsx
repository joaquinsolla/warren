import * as React from 'react'
import { CheckCircle2Icon, CircleAlertIcon, Trash2Icon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandIcon, normalizeDomain } from '@/components/BrandIcon'
import { ColorPicker } from '@/components/ColorPicker'
import { CURRENCIES } from '@/lib/currencies'
import { brandStyle } from '@/lib/brand'
import { useProfile } from '@/features/profile/hooks'
import { useCreateEntity, useUpdateEntity } from '@/features/entities/hooks'
import { DeleteEntityDialog } from '@/features/entities/DeleteEntityDialog'
import type { Entity, EntityType } from '@/features/entities/api'

type EntityFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  entity?: Entity | null
}

export function EntityFormDialog({
  open,
  onOpenChange,
  portfolioId,
  entity,
}: EntityFormDialogProps) {
  const isEdit = Boolean(entity)
  const { data: profile } = useProfile()
  const createMutation = useCreateEntity(portfolioId)
  const updateMutation = useUpdateEntity(portfolioId)

  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<EntityType>('BANK')
  const [currency, setCurrency] = React.useState('EUR')
  const [iconDomain, setIconDomain] = React.useState('')
  const [color, setColor] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const cleanDomain = normalizeDomain(iconDomain)
  const domainLooksValid =
    cleanDomain !== null && /\.[a-z]{2,}$/.test(cleanDomain)

  React.useEffect(() => {
    if (!open) return
    setName(entity?.name ?? '')
    setType(entity?.type ?? 'BANK')
    setCurrency(entity?.currency ?? profile?.base_currency ?? 'EUR')
    setIconDomain(entity?.icon_domain ?? '')
    setColor(entity?.color ?? null)
    setErrorMsg(null)
  }, [open, entity, profile?.base_currency])

  const isPending = createMutation.isPending || updateMutation.isPending
  const trimmedName = name.trim()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)
    if (!trimmedName) {
      setErrorMsg('El nombre es obligatorio.')
      return
    }
    const values = {
      name: trimmedName,
      type,
      currency,
      icon_domain: cleanDomain,
      color,
    }
    try {
      if (isEdit && entity) {
        await updateMutation.mutateAsync({ id: entity.id, values })
      } else {
        await createMutation.mutateAsync(values)
      }
      onOpenChange(false)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {isEdit ? 'Editar entidad' : 'Nueva entidad'}
              </DialogTitle>
              <DialogDescription>
                Un banco o bróker donde mantienes efectivo o inversiones.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as EntityType)}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Banco</SelectItem>
                    <SelectItem value="BROKER">Bróker</SelectItem>
                  </SelectContent>
                </Select>
                {isEdit && (
                  <p className="text-muted-foreground text-xs">
                    El tipo no se puede cambiar.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Moneda del efectivo</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-name">Nombre</Label>
              <Input
                id="entity-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="BBVA, Trade Republic…"
                autoFocus
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-icon">
                Icono de la web{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <span style={brandStyle(color)}>
                  <BrandIcon
                    name={trimmedName || '?'}
                    domain={cleanDomain}
                    className={
                      color ? 'bg-brand text-brand-foreground' : undefined
                    }
                  />
                </span>
                <Input
                  id="entity-icon"
                  className="flex-1"
                  value={iconDomain}
                  onChange={(e) => setIconDomain(e.target.value)}
                  placeholder="bbva.com, traderepublic.com, revolut.com…"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
              {iconDomain.trim() && domainLooksValid && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CheckCircle2Icon className="text-positive size-3.5" />
                  Vista previa del icono a la izquierda. Si no aparece, se usará
                  la inicial.
                </p>
              )}
              {iconDomain.trim() && !domainLooksValid && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CircleAlertIcon className="size-3.5" />
                  Escribe un dominio válido, p. ej. <code>bbva.com</code>.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Color{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

            <DialogFooter>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={isPending}
                  className="sm:mr-auto"
                >
                  <Trash2Icon className="size-4" />
                  Eliminar
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !trimmedName}>
                {isEdit ? 'Guardar cambios' : 'Crear entidad'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {isEdit && (
        <DeleteEntityDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          portfolioId={portfolioId}
          entity={entity ?? null}
          onDeleted={() => onOpenChange(false)}
        />
      )}
    </>
  )
}
