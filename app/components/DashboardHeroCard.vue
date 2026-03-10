<script setup lang="ts">
withDefaults(defineProps<{
  isAdmin?: boolean
  roomsCount?: number
  morningCompletion?: string
  morningCount?: number
  eveningCompletion?: string
  eveningCount?: number
}>(), {
  isAdmin: false,
  roomsCount: 0,
  morningCompletion: '0%',
  morningCount: 0,
  eveningCompletion: '0%',
  eveningCount: 0
})

const emit = defineEmits<{
  createRoom: []
  signOut: []
}>()
</script>

<template>
  <UCard
    class="surface-card"
    :ui="{
      root: 'relative overflow-hidden rounded-[1.6rem] lg:rounded-[2rem]',
      body: 'hero-card-body p-5 sm:p-6 lg:p-7'
    }"
  >
    <div class="space-y-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0 space-y-2">
          <p class="section-kicker">
            Pflegeübersicht
          </p>
          <h1 class="hero-title">
            Räume in Reihenfolge abarbeiten
          </h1>
          <p class="hero-copy">
            Warnhinweise zuerst prüfen. Danach Fütterung und Beobachtungen direkt im jeweiligen Raum eintragen.
          </p>
        </div>

        <div class="w-full md:max-w-[35rem] md:flex-none">
          <div class="hint-grid">
            <div class="hint-card">
              <p class="hint-title">
                Wichtig
              </p>
              <p class="hint-text">
                Die Reihenfolge ist vorgegeben und soll eingehalten werden.
              </p>
            </div>

            <div class="hint-card">
              <p class="hint-title">
                Dokumentation
              </p>
              <p class="hint-text">
                Kommentar nur nutzen, wenn etwas auffällig oder erklärungsbedürftig war.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isAdmin"
        class="rounded-[1.6rem] border border-[var(--surface-line)] bg-white/84 p-4 sm:p-5"
      >
        <div class="flex flex-col gap-4">
          <div>
            <h2 class="section-title text-xl">
              Admin-Zugang
            </h2>
          </div>

          <div class="grid gap-3 lg:grid-cols-3">
            <div class="rounded-[1.2rem] border border-[var(--surface-line)] bg-white/88 px-4 py-4">
              <p class="section-kicker">
                Räume
              </p>
              <p class="mt-2 text-2xl font-semibold text-[var(--surface-ink)]">
                {{ roomsCount }}
              </p>
            </div>

            <div class="rounded-[1.2rem] border border-[var(--surface-line)] bg-white/88 px-4 py-4">
              <p class="section-kicker">
                Morgens
              </p>
              <p class="mt-2 text-2xl font-semibold text-[var(--surface-ink)]">
                {{ morningCompletion }}
              </p>
              <p class="mt-1 text-sm text-[var(--surface-muted)]">
                {{ morningCount }} von {{ roomsCount }} protokolliert
              </p>
            </div>

            <div class="rounded-[1.2rem] border border-[var(--surface-line)] bg-white/88 px-4 py-4">
              <p class="section-kicker">
                Abends
              </p>
              <p class="mt-2 text-2xl font-semibold text-[var(--surface-ink)]">
                {{ eveningCompletion }}
              </p>
              <p class="mt-1 text-sm text-[var(--surface-muted)]">
                {{ eveningCount }} von {{ roomsCount }} protokolliert
              </p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UButton
              color="primary"
              icon="i-lucide-plus"
              label="Neuen Raum anlegen"
              class="justify-center"
              @click="emit('createRoom')"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-chart-column"
              label="Analyse"
              class="justify-center"
              to="/admin/analyse"
            />
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-arrow-up-down"
              label="Reihenfolge bearbeiten"
              class="justify-center"
              to="/admin/reihenfolge"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-log-out"
              label="Abmelden"
              class="justify-center"
              @click="emit('signOut')"
            />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
