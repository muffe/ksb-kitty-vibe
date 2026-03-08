// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],
  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  runtimeConfig: {
    basicAuthUser: process.env.BASIC_AUTH_USER || 'ksb',
    basicAuthPass: process.env.BASIC_AUTH_PASS || 'ksb',
    adminFakeLoginPassword: process.env.NUXT_ADMIN_FAKE_LOGIN_PASSWORD || '',
    adminUserEmail: process.env.NUXT_ADMIN_USER_EMAIL || '',
    adminUserPassword: process.env.NUXT_ADMIN_USER_PASSWORD || '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://hnbqskvlhnhclwdeilyt.supabase.co',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnFza3ZsaG5oY2x3ZGVpbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODY5MTAxMzUsImV4cCI6MjAwMjQ4NjEzNX0.Is6shkC8hON-2Jf69FDeuJSfFRz_BqvKMFPt-oScWKs'
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
