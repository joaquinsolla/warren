import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Status = 'verifying' | 'ready' | 'invalid'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Establece la sesión de recuperación a partir del enlace del email.
  // Soporta los tres formatos posibles: hash con tokens (flujo implícito),
  // ?code= (PKCE) y ?token_hash=&type=recovery (enlaces verify).
  useEffect(() => {
    let active = true

    async function establishSession() {
      // 1) ¿Ya hay sesión activa (p. ej. detectSessionInUrl o evento)?
      const { data: existing } = await supabase.auth.getSession()
      if (existing.session) {
        if (active) setStatus('ready')
        return
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const query = new URLSearchParams(window.location.search)

      // Error explícito en el enlace (caducado / usado).
      if (hash.get('error') || query.get('error')) {
        if (active) setStatus('invalid')
        return
      }

      try {
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        const code = query.get('code')
        const tokenHash = query.get('token_hash')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (error) throw error
        } else {
          // Sin credenciales en la URL y sin sesión previa.
          if (active) setStatus('invalid')
          return
        }

        // Limpia los tokens de la URL.
        window.history.replaceState(null, '', window.location.pathname)
        if (active) setStatus('ready')
      } catch {
        if (active) setStatus('invalid')
      }
    }

    // El SDK también emite PASSWORD_RECOVERY al detectar el enlace.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || session) && active) {
        setStatus('ready')
      }
    })

    establishSession()

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {status === 'invalid' ? 'Enlace no válido' : 'Nueva contraseña'}
          </CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Verificando el enlace…'}
            {status === 'ready' && 'Introduce tu nueva contraseña'}
            {status === 'invalid' &&
              'El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'invalid' ? (
            <Link
              to="/forgot-password"
              className="text-sm text-foreground underline-offset-4 hover:underline"
            >
              Solicitar un nuevo enlace
            </Link>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={status !== 'ready'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Repetir contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={status !== 'ready'}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={loading || status !== 'ready'}
                className="w-full"
              >
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
