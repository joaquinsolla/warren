import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
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

export function LoginPage() {
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (!authLoading && session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setError(traducirError(error.message))
      setLoading(false)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Accede a tu cuenta de Warren para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link
              to="/signup"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function traducirError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Debes confirmar tu email antes de iniciar sesión.'
  }
  return message
}
