<script setup lang="ts">
import { daypartLabel, type Daypart } from '~/utils/cat-shelter'

withDefaults(defineProps<{
  isAdmin?: boolean
  preferredDaypart?: Daypart
  roomsCount?: number
  completedCount?: number
  morningCount?: number
  eveningCount?: number
}>(), {
  isAdmin: false,
  preferredDaypart: 'morning',
  roomsCount: 0,
  completedCount: 0,
  morningCount: 0,
  eveningCount: 0
})

const emit = defineEmits<{
  createRoom: []
  signOut: []
}>()
</script>

<template>
  <section class="dashboard-hero space-y-5">
    <div class="dashboard-hero__main">
      <div class="min-w-0 space-y-3">
        <p class="section-kicker">
          Pflegeübersicht
        </p>
        <h1 class="hero-title">
          Rundgang ohne Umwege
        </h1>
        <p class="hero-copy">
          Raum öffnen, Beobachtung notieren, speichern. Alles andere ist nachgeordnet.
        </p>
      </div>

      <div class="dashboard-hero__status">
        <div class="dashboard-hero__pill">
          {{ daypartLabel(preferredDaypart) }}
        </div>
        <div>
          <p class="text-sm font-semibold text-[var(--surface-ink)]">
            {{ completedCount }}/{{ roomsCount }} Räume dokumentiert
          </p>
          <p class="mt-1 text-sm leading-6 text-[var(--surface-muted)]">
            Reihenfolge einhalten. Kommentare nur bei Auffälligkeiten oder Abweichungen.
          </p>
        </div>
      </div>
    </div>

    <div class="dashboard-hero__route">
      <div class="dashboard-hero__route-step">
        <span class="dashboard-hero__route-index">1</span>
        <div>
          <p class="text-sm font-semibold text-[var(--surface-ink)]">
            Reihenfolge beachten
          </p>
          <p class="text-sm leading-6 text-[var(--surface-muted)]">
            Der Startpunkt wird unten im Dashboard hervorgehoben.
          </p>
        </div>
      </div>
      <div class="dashboard-hero__route-step">
        <span class="dashboard-hero__route-index">2</span>
        <div>
          <p class="text-sm font-semibold text-[var(--surface-ink)]">
            Eintrag kurz halten
          </p>
          <p class="text-sm leading-6 text-[var(--surface-muted)]">
            Nur fressen, Kot und echte Auffälligkeiten dokumentieren.
          </p>
        </div>
      </div>
      <div class="dashboard-hero__route-step">
        <span class="dashboard-hero__route-index">3</span>
        <div>
          <p class="text-sm font-semibold text-[var(--surface-ink)]">
            Direkt weiter
          </p>
          <p class="text-sm leading-6 text-[var(--surface-muted)]">
            Nach dem Speichern sofort zum nächsten offenen Raum wechseln.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="isAdmin"
      class="dashboard-admin-strip"
    >
      <div class="space-y-1">
        <p class="section-kicker">
          Admin
        </p>
        <p class="text-sm leading-6 text-[var(--surface-muted)]">
          {{ roomsCount }} Räume. Morgens {{ morningCount }} erledigt, abends {{ eveningCount }} erledigt.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton
          color="primary"
          icon="i-lucide-plus"
          label="Raum anlegen"
          @click="emit('createRoom')"
        />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-chart-column"
          label="Analyse"
          to="/admin/analyse"
        />
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-up-down"
          label="Reihenfolge"
          to="/admin/reihenfolge"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          label="Abmelden"
          @click="emit('signOut')"
        />
      </div>
    </div>
  </section>
</template>
