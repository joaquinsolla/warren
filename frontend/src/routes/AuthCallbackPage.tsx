import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function AuthCallbackPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Los errores del enlace (expirado, inválido) llegan en la URL.
    const raw = window.location.hash.replace(/^#/, '') || window.location.search
    const params = new URLSearchParams(raw)
    const desc = params.get('error_description') ?? params.get('error')
    if (desc) setError(desc.replace(/\+/g, ' '))
  }, [])

  useEffect(() => {
    if (loading || error) return
    if (session) {
      navigate('/', { replace: true })
    } else {
      const t = setTimeout(() => navigate('/login', { replace: true }), 2500)
      return () => clearTimeout(t)
    }
  }, [session, loading, error, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {error ? 'Enlace no válido' : 'Confirmando…'}
          </CardTitle>
          <CardDescription>
            {error
              ? 'El enlace ha caducado o no es válido. Solicita uno nuevo.'
              : 'Estamos verificando tu cuenta, un momento.'}
          </CardDescription>
        </CardHeader>
        {error && (
          <CardContent>
            <Link
              to="/login"
              className="text-sm text-foreground underline-offset-4 hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
