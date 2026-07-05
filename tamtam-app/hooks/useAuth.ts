import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Profile = Pick<
  Database['public']['Tables']['users']['Row'],
  | 'id'
  | 'name'
  | 'role'
  | 'balance'
  | 'available_balance'
  | 'pending_balance'
  | 'total_valid_clicks'
  | 'total_earned'
  | 'city'
  | 'phone'
>

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, role, balance, available_balance,
          pending_balance, total_valid_clicks, total_earned,
          city, phone
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[useAuth] fetchProfile failed:', error)
      }
      setProfile(data)
    } catch (err) {
      console.error('[useAuth] fetchProfile threw:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s)
        if (s?.user) fetchProfile(s.user.id)
        else setLoading(false)
      })
      .catch(() => setLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, s: Session | null) => {
        setSession(s)
        if (s?.user) fetchProfile(s.user.id)
        else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function signOut() {
    await supabase.auth.signOut()
  }

  const refetchProfile = useCallback(() => {
    if (session?.user) fetchProfile(session.user.id)
  }, [session, fetchProfile])

  return { session, profile, loading, signOut, refetchProfile }
}
