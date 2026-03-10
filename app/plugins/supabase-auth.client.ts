export default defineNuxtPlugin(() => {
  const supabase = useSupabase()
  const adminUser = useAdminUser()
  const authReady = useAdminAuthReady()
  const route = useRoute()

  const restoreSession = async () => {
    const { data } = await supabase.auth.getSession()

    adminUser.value = data.session?.user ?? null
    authReady.value = true
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    adminUser.value = session?.user ?? null
    authReady.value = true
  })

  if (route.path.startsWith('/admin')) {
    void restoreSession()
    return
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => {
      void restoreSession()
    })
    return
  }

  window.setTimeout(() => {
    void restoreSession()
  }, 250)
})
