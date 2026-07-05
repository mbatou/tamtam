// Data-layer client for the tamma.me web API (/api/echo/*).
// Auth stays on supabase-js (lib/supabase.ts); every data read/write in the
// app goes through this module so the mobile app and the web app share the
// exact same server-side logic and response shapes.
import { supabase } from './supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://tamma.me'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body && typeof body.error === 'string') message = body.error
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new ApiError(message, res.status)
  }

  return (await res.json()) as T
}
