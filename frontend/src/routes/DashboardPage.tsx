import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function DashboardPage() {
  const { user } = useAuth()

  // Query de prueba: cuenta los portfolios del usuario. Gracias a RLS solo
  // devuelve los suyos, aunque no filtremos por user_id explícitamente.
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolios-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Warren</h1>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Conectado como <span className="font-medium">{user?.email}</span>
      </p>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 font-medium">Prueba de conexión con Supabase</h2>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            Error: {(error as Error).message}
          </p>
        )}
        {!isLoading && !error && (
          <p className="text-sm">
            Portfolios encontrados:{' '}
            <span className="font-semibold">{data}</span>
          </p>
        )}
      </div>
    </div>
  )
}
