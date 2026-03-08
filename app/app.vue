<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'de'
  }
})

const title = 'KSB Katzenstation'
const description = 'Interne Katzenraum-Verwaltung für Räume, Fütterung, Warnhinweise und Tagesprotokolle.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/favicon.ico',
  twitterImage: '/favicon.ico',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UMain class="min-h-screen">
      <NuxtPage />
    </UMain>
  </UApp>
</template>
