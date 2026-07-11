import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Recupera la sesión actual (si el usuario ya estaba logueado).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Se suscribe a cambios de sesión (login, logout, refresh de token).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}
