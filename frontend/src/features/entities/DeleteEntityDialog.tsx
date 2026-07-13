import * as React from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useDeleteEntity } from '@/features/entities/hooks'
import type { Entity } from '@/features/entities/api'

const COUNTDOWN_SECONDS = 10

type DeleteEntityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolioId: string
  entity: Entity | null
  onDeleted?: () => void
}

function isForeignKeyError(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return (
    e?.code === '23503' ||
    Boolean(e?.message && e.message.includes('foreign key'))
  )
}

export function DeleteEntityDialog({
  open,
  onOpenChange,
  portfolioId,
  entity,
  onDeleted,
}: DeleteEntityDialogProps) {
  const { user } = useAuth()
  const deleteMutation = useDeleteEntity(portfolioId)

  const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS)
  const [password, setPassword] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [verifying, setVerifying] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setCountdown(COUNTDOWN_SECONDS)
    setPassword('')
    setErrorMsg(null)
    setVerifying(false)
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  const isPending = verifying || deleteMutation.isPending
  const canConfirm =
    countdown === 0 && password.length > 0 && !isPending && Boolean(entity)

  async function handleDelete() {
    if (!entity || !user?.email) return
    setErrorMsg(null)
    setVerifying(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      })
      if (authError) {
        setErrorMsg('Contraseña incorrecta.')
        setVerifying(false)
        return
      }
      await deleteMutation.mutateAsync(entity.id)
      setVerifying(false)
      onDeleted?.()
      onOpenChange(false)
    } catch (err) {
      setVerifying(false)
      if (isForeignKeyError(err)) {
        setErrorMsg(
          'No se puede eliminar: esta entidad tiene movimientos asociados. ' +
            'El histórico contable no puede perderse.',
        )
        return
      }
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-full">
            <TriangleAlertIcon className="size-5" />
          </div>
          <DialogTitle>Eliminar «{entity?.name}»</DialogTitle>
          <DialogDescription>
            La entidad desaparecerá de tus listas, selectores y del patrimonio
            total. Sus movimientos se conservan en el histórico, marcados como
            pertenecientes a una entidad eliminada. Esta acción no se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-entity-password">
            Introduce tu contraseña para confirmar
          </Label>
          <Input
            id="delete-entity-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
          />
        </div>

        {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canConfirm}
          >
            {countdown > 0
              ? `Espera ${countdown}s…`
              : isPending
                ? 'Eliminando…'
                : 'Eliminar definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
