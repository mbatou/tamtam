// AUTH ONLY: this client handles login/register/session (supabase.auth.*).
// All data reads/writes go through the web API via lib/api.ts.
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import type { Database } from './database.types'

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {}
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '**********************************************************************\n' +
      '[supabase] MISCONFIGURED BUILD:\n' +
      `  EXPO_PUBLIC_SUPABASE_URL is ${supabaseUrl ? 'set' : 'MISSING'}\n` +
      `  EXPO_PUBLIC_SUPABASE_ANON_KEY is ${supabaseAnonKey ? 'set' : 'MISSING'}\n` +
      'Every Supabase request WILL fail. Set these variables in the eas.json\n' +
      'build profile env (or your local environment for `expo start`).\n' +
      '**********************************************************************'
  )
}

// When misconfigured, fall back to obviously-invalid placeholders so that
// importing this module never throws (createClient rejects empty values) —
// the console.error above is the unmissable signal.
export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://misconfigured-missing-env.supabase.co',
  supabaseAnonKey ?? 'misconfigured-missing-env',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
