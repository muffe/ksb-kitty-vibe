export default defineNuxtPlugin(async () => {
  const supabase = useSupabase()
  const adminUser = useAdminUser()
  const authReady = useAdminAuthReady()

  const { data } = await supabase.auth.getSession()

  adminUser.value = data.session?.user ?? null
  authReady.value = true

  supabase.auth.onAuthStateChange((_event, session) => {
    adminUser.value = session?.user ?? null
    authReady.value = true
  })
})
