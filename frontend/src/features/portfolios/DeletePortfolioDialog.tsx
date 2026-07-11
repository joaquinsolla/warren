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
import { useDeletePortfolio } from '@/features/portfolios/hooks'
import type { Portfolio } from '@/features/portfolios/api'

const COUNTDOWN_SECONDS = 10

type DeletePortfolioDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  portfolio: Portfolio | null
  onDeleted?: () => void
}

export function DeletePortfolioDialog({
  open,
  onOpenChange,
  portfolio,
  onDeleted,
}: DeletePortfolioDialogProps) {
  const { user } = useAuth()
  const deleteMutation = useDeletePortfolio()

  const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS)
  const [password, setPassword] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [verifying, setVerifying] = React.useState(false)

  // Reinicia el estado y arranca la cuenta atrás cada vez que se abre.
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
    countdown === 0 && password.length > 0 && !isPending && Boolean(portfolio)

  async function handleDelete() {
    if (!portfolio || !user?.email) return
    setErrorMsg(null)
    setVerifying(true)
    try {
      // Verifica la contraseña reautenticando al usuario.
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      })
      if (authError) {
        setErrorMsg('Contraseña incorrecta.')
        setVerifying(false)
        return
      }
      await deleteMutation.mutateAsync(portfolio.id)
      setVerifying(false)
      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      setErrorMsg((err as Error).message)
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-full">
            <TriangleAlertIcon className="size-5" />
          </div>
          <DialogTitle>Eliminar «{portfolio?.name}»</DialogTitle>
          <DialogDescription>
            Esta acción es irreversible. Se eliminarán también{' '}
            <strong>todas las entidades y movimientos</strong> de esta cartera.
            No podrás recuperar el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-password">
            Introduce tu contraseña para confirmar
          </Label>
          <Input
            id="delete-password"
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
              : deleteMutation.isPending || verifying
                ? 'Eliminando…'
                : 'Eliminar definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
