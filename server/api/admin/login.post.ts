import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<{ password?: string }>(event)
  const password = body.password?.trim() ?? ''

  if (!config.adminFakeLoginPassword || !config.adminUserEmail || !config.adminUserPassword) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Admin-Login ist nicht vollständig konfiguriert.'
    })
  }

  if (!password || password !== config.adminFakeLoginPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Das Passwort ist nicht korrekt.'
    })
  }

  const supabase = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.adminUserEmail,
    password: config.adminUserPassword
  })

  if (error || !data.session) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase-Admin-Login fehlgeschlagen.'
    })
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  }
})
