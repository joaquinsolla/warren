import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            {sent
              ? 'Si el email existe, recibirás un enlace para restablecer tu contraseña.'
              : 'Introduce tu email y te enviaremos un enlace para restablecerla.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Link
              to="/login"
              className="text-sm text-foreground underline-offset-4 hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          ) : (
            <>
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

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link
                  to="/login"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Volver a iniciar sesión
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
