import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  name: string
  role: string
  balance: number
  available_balance: number
  pending_balance: number
  total_valid_clicks: number
  total_earned: number
  city: string | null
  phone: string | null
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select(`
        id, name, role, balance, available_balance,
        pending_balance, total_valid_clicks, total_earned,
        city, phone
      `)
      .eq('id', userId)
      .single()

    setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
      setSession(s)
      if (s?.user) fetchProfile(s.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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
