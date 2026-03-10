<script setup lang="ts">
import {
  daypartLabel,
  formatDateTime,
  inferredCurrentDaypart,
  roomDisplayName,
  sortRooms,
  type Room,
  type RoomLogWithRoom
} from '~/utils/cat-shelter'
import { analyzeRooms, type AlertSeverity } from '~/utils/admin-analysis'

const supabase = useSupabase()
const adminUser = useAdminUser()
const authReady = useAdminAuthReady()

const rooms = ref<Room[]>([])
const logs = ref<RoomLogWithRoom[]>([])
const loading = ref(true)
const notice = ref<{ tone: 'error' | 'info', text: string } | null>(null)

const isAdmin = computed(() => Boolean(adminUser.value))
const sortedRooms = computed(() => sortRooms(rooms.value))
const currentDaypart = computed(() => inferredCurrentDaypart())
const analysis = computed(() => analyzeRooms(sortedRooms.value, logs.value, currentDaypart.value))

const earlyWarnings = computed(() => analysis.value.warningFeed.slice(0, 8))
const riskCounts = computed(() => ({
  red: analysis.value.roomSummaries.filter(summary => summary.severity === 'red').length,
  yellow: analysis.value.roomSummaries.filter(summary => summary.severity === 'yellow').length,
  green: analysis.value.roomSummaries.filter(summary => summary.severity === 'green').length
}))
const compactRoomSummaries = computed(() => {
  const order = {
    red: 0,
    yellow: 1,
    green: 2
  } as const

  return [...analysis.value.roomSummaries].sort((left, right) => {
    const severityDiff = order[left.severity] - order[right.severity]

    if (severityDiff !== 0) {
      return severityDiff
    }

    return left.room.sort_order - right.room.sort_order
  })
})

function severityLabel(severity: AlertSeverity) {
  if (severity === 'red') {
    return 'Rot'
  }

  if (severity === 'yellow') {
    return 'Gelb'
  }

  return 'Grün'
}

function severityColor(severity: AlertSeverity) {
  if (severity === 'red') {
    return 'error'
  }

  if (severity === 'yellow') {
    return 'warning'
  }

  return 'success'
}

function severityDotClass(severity: AlertSeverity) {
  if (severity === 'red') {
    return 'bg-red-500 ring-red-200'
  }

  if (severity === 'yellow') {
    return 'bg-amber-400 ring-amber-200'
  }

  return 'bg-emerald-500 ring-emerald-200'
}

async function refreshAll() {
  loading.value = true
  notice.value = null

  const [roomsResult, logsResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('room_logs')
      .select(`
        id,
        room_id,
        daypart,
        ate_all_food,
        no_stool_found,
        stool_firm,
        stool_almost_firm,
        stool_soft,
        stool_mixed,
        stool_mushy,
        stool_watery,
        employee_name,
        comment,
        created_at,
        updated_at,
        room:rooms(name, number)
      `)
      .order('created_at', { ascending: false })
      .limit(800)
  ])

  if (roomsResult.error) {
    loading.value = false
    notice.value = { tone: 'error', text: roomsResult.error.message }
    return
  }

  if (logsResult.error) {
    loading.value = false
    notice.value = { tone: 'error', text: logsResult.error.message }
    return
  }

  rooms.value = (roomsResult.data ?? []) as Room[]
  logs.value = (logsResult.data ?? []) as RoomLogWithRoom[]
  loading.value = false
}

watch(
  () => [authReady.value, adminUser.value?.id] as const,
  async () => {
    if (!authReady.value) {
      return
    }

    if (isAdmin.value) {
      await refreshAll()
      return
    }

    loading.value = false
  }
)

onMounted(() => {
  if (authReady.value && isAdmin.value) {
    void refreshAll()
    return
  }

  if (authReady.value) {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
    <section class="top-grid">
      <UCard class="hero-card">
        <div class="space-y-4">
          <div class="space-y-2">
            <p class="section-kicker">
              Administration
            </p>
            <h1 class="hero-title">
              Warnungen & Analyse
            </h1>
            <p class="hero-copy">
              Frühwarnungen, Trends und auffällige Protokolle für die tägliche Stationsübersicht.
            </p>
          </div>

          <div class="hint-grid">
            <div class="hint-card">
              <p class="hint-title">
                Rote Räume
              </p>
              <p class="hint-text">
                {{ riskCounts.red }} aktuell kritisch
              </p>
            </div>

            <div class="hint-card">
              <p class="hint-title">
                Gelbe Räume
              </p>
              <p class="hint-text">
                {{ riskCounts.yellow }} beobachten
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="surface-card admin-card">
        <div class="space-y-3">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-house"
            label="Zur Startseite"
            to="/"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-panels-top-left"
            label="Raumdetails"
            to="/raeume"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-up-down"
            label="Reihenfolge"
            to="/admin/reihenfolge"
          />
        </div>
      </UCard>
    </section>

    <div
      v-if="notice"
      class="status-banner status-banner--error"
    >
      <p class="text-sm font-semibold">
        {{ notice.text }}
      </p>
    </div>

    <UCard
      v-if="authReady && !isAdmin"
      class="surface-card"
    >
      <div class="space-y-2">
        <h2 class="section-title">
          Kein Zugriff
        </h2>
        <p class="text-sm text-[var(--surface-muted)]">
          Diese Seite ist nur im Admin-Modus sichtbar.
        </p>
      </div>
    </UCard>

    <template v-else>
      <UCard
        v-if="loading"
        class="surface-card"
      >
        <div class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-8 text-sm text-[var(--surface-muted)]">
          Analysedaten werden geladen ...
        </div>
      </UCard>

      <template v-else>
        <section class="space-y-6">
          <UCard class="surface-card">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="section-title">
                    Ampel pro Raum
                  </h2>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UBadge color="error" variant="subtle" :label="`${riskCounts.red} Rot`" />
                  <UBadge color="warning" variant="subtle" :label="`${riskCounts.yellow} Gelb`" />
                  <UBadge color="success" variant="subtle" :label="`${riskCounts.green} Grün`" />
                </div>
              </div>
            </template>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <UTooltip
                v-for="summary in compactRoomSummaries"
                :key="summary.room.id"
                :delay-duration="0"
                arrow
              >
                <button
                  type="button"
                  class="flex min-h-18 items-center gap-2 rounded-[1.1rem] border border-[var(--surface-line)] bg-white/86 px-3 py-2 text-left transition hover:border-[var(--ui-border-accented)] hover:bg-white"
                >
                  <span
                    class="size-2.5 shrink-0 rounded-full ring-3"
                    :class="severityDotClass(summary.severity)"
                  />

                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-[var(--surface-ink)]">
                      {{ roomDisplayName(summary.room) }}
                    </p>
                    <p class="mt-0.5 text-[11px] leading-4 text-[var(--surface-muted)]">
                      {{ summary.issues.length ? `${summary.issues.length} Hinweis${summary.issues.length > 1 ? 'e' : ''}` : 'OK' }}
                    </p>
                  </div>
                </button>

                <template #content>
                  <div class="max-w-xs space-y-2">
                    <p class="text-sm font-semibold text-[var(--ui-text-highlighted)]">
                      {{ roomDisplayName(summary.room) }} · {{ severityLabel(summary.severity) }}
                    </p>
                    <p
                      v-if="summary.latestEmployee && summary.latestLogAt"
                      class="text-xs leading-5 text-[var(--ui-text-muted)]"
                    >
                      Letzter Eintrag: {{ summary.latestEmployee }} · {{ formatDateTime(summary.latestLogAt) }}
                    </p>
                    <p
                      v-if="!summary.issues.length"
                      class="text-xs leading-5 text-[var(--ui-text-muted)]"
                    >
                      Aktuell keine Auffälligkeiten.
                    </p>
                    <ul
                      v-else
                      class="space-y-1 text-xs leading-5 text-[var(--ui-text-muted)]"
                    >
                      <li
                        v-for="issue in summary.issues.slice(0, 3)"
                        :key="`${summary.room.id}-${issue.code}`"
                      >
                        {{ issue.title }}
                      </li>
                    </ul>
                  </div>
                </template>
              </UTooltip>
            </div>
          </UCard>

          <section class="content-grid">
            <UCard class="surface-card">
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h2 class="section-title">
                      Sofort prüfen
                    </h2>
                  </div>
                  <UBadge
                    :color="earlyWarnings.some(entry => entry.severity === 'red') ? 'error' : 'warning'"
                    variant="subtle"
                    :label="`${earlyWarnings.length} Hinweise`"
                  />
                </div>
              </template>

              <div
                v-if="!earlyWarnings.length"
                class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
              >
                Aktuell gibt es keine automatischen Warnungen.
              </div>

              <div
                v-else
                class="space-y-3"
              >
                <div
                  v-for="entry in earlyWarnings"
                  :key="`${entry.room.id}-${entry.title}-${entry.detectedAt}`"
                  class="rounded-[1.35rem] border border-[var(--surface-line)] bg-white/86 p-4"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-[var(--surface-ink)]">
                        {{ roomDisplayName(entry.room) }}
                      </p>
                      <p class="mt-1 text-sm text-[var(--surface-muted)]">
                        {{ entry.title }}
                      </p>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <UBadge
                        :color="severityColor(entry.severity)"
                        variant="subtle"
                        :label="severityLabel(entry.severity)"
                      />
                      <UBadge
                        color="neutral"
                        variant="subtle"
                        :label="formatDateTime(entry.detectedAt)"
                      />
                    </div>
                  </div>

                  <p class="mt-3 text-sm leading-6 text-[var(--surface-muted)]">
                    {{ entry.description }}
                  </p>
                </div>
              </div>
            </UCard>

            <UCard class="surface-card">
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h2 class="section-title">
                      Nachträge
                    </h2>
                  </div>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    :label="`${analysis.editedLogs.length} Änderungen`"
                  />
                </div>
              </template>

              <div
                v-if="!analysis.editedLogs.length"
                class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
              >
                Keine nachträglich bearbeiteten Protokolle.
              </div>

              <div
                v-else
                class="space-y-3"
              >
                <div
                  v-for="log in analysis.editedLogs.slice(0, 10)"
                  :key="log.id"
                  class="rounded-[1.35rem] border border-[var(--surface-line)] bg-white/86 p-4"
                >
                  <p class="text-sm font-semibold text-[var(--surface-ink)]">
                    {{ log.room ? roomDisplayName(log.room) : 'Unbekannter Raum' }}
                  </p>
                  <p class="mt-1 text-sm text-[var(--surface-muted)]">
                    Erstellt: {{ formatDateTime(log.created_at) }} · Aktualisiert: {{ formatDateTime(log.updated_at) }}
                  </p>
                </div>
              </div>
            </UCard>
          </section>

          <UCard class="surface-card">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="section-title">
                    Prioritätsnotizen
                  </h2>
                </div>
                <UBadge
                  :color="analysis.priorityComments.length ? 'error' : 'neutral'"
                  variant="subtle"
                  :label="`${analysis.priorityComments.length} Treffer`"
                />
              </div>
            </template>

            <div
              v-if="!analysis.priorityComments.length"
              class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
            >
              Keine Prioritätskommentare gefunden.
            </div>

            <div
              v-else
              class="space-y-3"
            >
              <div
                v-for="entry in analysis.priorityComments.slice(0, 12)"
                :key="entry.log.id"
                class="rounded-[1.35rem] border border-[var(--surface-line)] bg-white/86 p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-[var(--surface-ink)]">
                      {{ roomDisplayName(entry.room) }}
                    </p>
                    <p class="mt-1 text-sm text-[var(--surface-muted)]">
                      {{ entry.log.employee_name }} · {{ formatDateTime(entry.log.created_at) }}
                    </p>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <UBadge
                      v-for="match in entry.matches"
                      :key="`${entry.log.id}-${match}`"
                      color="error"
                      variant="subtle"
                      :label="match"
                    />
                  </div>
                </div>

                <p class="mt-3 text-sm leading-6 text-[var(--surface-muted)]">
                  {{ entry.log.comment }}
                </p>
              </div>
            </div>
          </UCard>
        </section>
      </template>
    </template>
  </div>
</template>
