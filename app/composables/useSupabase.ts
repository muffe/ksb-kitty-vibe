import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database } from '~/types/supabase'

let browserClient: SupabaseClient<Database> | null = null

export function useSupabase() {
  const config = useRuntimeConfig()

  if (import.meta.server) {
    return createClient<Database>(config.public.supabaseUrl, config.public.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  }

  if (!browserClient) {
    browserClient = createClient<Database>(config.public.supabaseUrl, config.public.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  }

  return browserClient
}

export function useAdminUser() {
  return useState<User | null>('supabase-admin-user', () => null)
}

export function useAdminAuthReady() {
  return useState<boolean>('supabase-admin-auth-ready', () => false)
}
