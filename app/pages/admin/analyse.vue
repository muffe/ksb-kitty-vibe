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
        <section class="content-grid">
          <UCard class="surface-card">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="section-title">
                    Frühwarnungen
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
                      {{ entry.description }}
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
              </div>
            </div>
          </UCard>

          <UCard class="surface-card">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="section-title">
                    Übersicht pro Tageszeit
                  </h2>
                </div>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :label="`${analysis.daypartOverview.length} Bereiche`"
                />
              </div>
            </template>

            <div class="space-y-3">
              <div
                v-for="entry in analysis.daypartOverview"
                :key="entry.daypart"
                class="rounded-[1.35rem] border border-[var(--surface-line)] bg-white/86 p-4"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h3 class="section-title text-lg">
                    {{ daypartLabel(entry.daypart) }}
                  </h3>
                  <UBadge
                    color="primary"
                    variant="subtle"
                    :label="`${entry.completedRooms} Räume protokolliert`"
                  />
                </div>

                <div class="mt-3 grid gap-3 sm:grid-cols-2">
                  <p class="text-sm text-[var(--surface-muted)]">
                    Futter nicht vollständig:
                    <span class="font-semibold text-[var(--surface-ink)]">{{ entry.incompleteFoodRooms }}</span>
                  </p>
                  <p class="text-sm text-[var(--surface-muted)]">
                    Kein Kot:
                    <span class="font-semibold text-[var(--surface-ink)]">{{ entry.noStoolRooms }}</span>
                  </p>
                  <p class="text-sm text-[var(--surface-muted)]">
                    Brei/Wässrig:
                    <span class="font-semibold text-[var(--surface-ink)]">{{ entry.softStoolRooms }}</span>
                  </p>
                  <p class="text-sm text-[var(--surface-muted)]">
                    Prioritätskommentare:
                    <span class="font-semibold text-[var(--surface-ink)]">{{ entry.priorityComments }}</span>
                  </p>
                </div>

                <div
                  v-if="entry.topRiskRooms.length"
                  class="mt-4 flex flex-wrap gap-2"
                >
                  <UBadge
                    v-for="risk in entry.topRiskRooms"
                    :key="`${entry.daypart}-${risk.room.id}`"
                    color="warning"
                    variant="subtle"
                    :label="`${roomDisplayName(risk.room)} (${risk.issues})`"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </section>

        <UCard class="surface-card">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="section-title">
                  Offene Probleme
                </h2>
              </div>
              <UBadge
                :color="analysis.openIssues.some(entry => entry.severity === 'red') ? 'error' : 'warning'"
                variant="subtle"
                :label="`${analysis.openIssues.length} Räume auffällig`"
              />
            </div>
          </template>

          <div
            v-if="!analysis.openIssues.length"
            class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
          >
            Aktuell gibt es keine offenen Probleme.
          </div>

          <div
            v-else
            class="space-y-4"
          >
            <div
              v-for="summary in analysis.openIssues"
              :key="summary.room.id"
              class="rounded-[1.45rem] border border-[var(--surface-line)] bg-white/86 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="section-title text-lg">
                    {{ roomDisplayName(summary.room) }}
                  </h3>
                  <p
                    v-if="summary.latestEmployee && summary.latestLogAt"
                    class="mt-1 text-sm text-[var(--surface-muted)]"
                  >
                    Letzter Eintrag: {{ summary.latestEmployee }} · {{ formatDateTime(summary.latestLogAt) }}
                  </p>
                </div>

                <UBadge
                  :color="severityColor(summary.severity)"
                  variant="subtle"
                  :label="severityLabel(summary.severity)"
                />
              </div>

              <div class="mt-4 grid gap-3 lg:grid-cols-2">
                <div
                  v-for="issue in summary.issues"
                  :key="`${summary.room.id}-${issue.code}`"
                  class="rounded-[1rem] bg-[var(--surface-panel)] px-3 py-3"
                >
                  <p class="text-sm font-semibold text-[var(--surface-ink)]">
                    {{ issue.title }}
                  </p>
                  <p class="mt-1 text-sm leading-6 text-[var(--surface-muted)]">
                    {{ issue.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <section class="content-grid">
          <UCard class="surface-card">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="section-title">
                    Ampel pro Raum
                  </h2>
                </div>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :label="`${analysis.roomSummaries.length} Räume`"
                />
              </div>
            </template>

            <div class="space-y-3">
              <div
                v-for="summary in analysis.roomSummaries"
                :key="summary.room.id"
                class="rounded-[1.35rem] border border-[var(--surface-line)] bg-white/86 p-4"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-[var(--surface-ink)]">
                      {{ roomDisplayName(summary.room) }}
                    </p>
                    <p class="mt-1 text-sm text-[var(--surface-muted)]">
                      {{ summary.issues[0]?.title || 'Aktuell unauffällig' }}
                    </p>
                  </div>

                  <UBadge
                    :color="severityColor(summary.severity)"
                    variant="subtle"
                    :label="severityLabel(summary.severity)"
                  />
                </div>
              </div>
            </div>
          </UCard>

          <UCard class="surface-card">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="section-title">
                    Bearbeitungsmonitor
                  </h2>
                </div>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :label="`${analysis.editedLogs.length} Nachträge`"
                />
              </div>
            </template>

            <div
              v-if="!analysis.editedLogs.length"
              class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
            >
              Bisher wurden keine Protokolle nachträglich geändert.
            </div>

            <div
              v-else
              class="space-y-3"
            >
              <div
                v-for="log in analysis.editedLogs.slice(0, 12)"
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
                  Trendansicht pro Raum
                </h2>
              </div>
              <UBadge
                color="neutral"
                variant="subtle"
                label="letzte 7 Tage"
              />
            </div>
          </template>

          <div class="grid gap-4 lg:grid-cols-2">
            <div
              v-for="trend in analysis.trendSummaries"
              :key="trend.room.id"
              class="rounded-[1.45rem] border border-[var(--surface-line)] bg-white/86 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h3 class="section-title text-lg">
                  {{ roomDisplayName(trend.room) }}
                </h3>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :label="`${trend.entries7d} Einträge`"
                />
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <p class="text-sm text-[var(--surface-muted)]">
                  Futter nicht vollständig:
                  <span class="font-semibold text-[var(--surface-ink)]">{{ trend.incompleteFood7d }}</span>
                </p>
                <p class="text-sm text-[var(--surface-muted)]">
                  Kein Kot:
                  <span class="font-semibold text-[var(--surface-ink)]">{{ trend.noStool7d }}</span>
                </p>
                <p class="text-sm text-[var(--surface-muted)]">
                  Brei/Wässrig:
                  <span class="font-semibold text-[var(--surface-ink)]">{{ trend.softStool7d }}</span>
                </p>
                <p class="text-sm text-[var(--surface-muted)]">
                  Kommentare:
                  <span class="font-semibold text-[var(--surface-ink)]">{{ trend.commentCount7d }}</span>
                </p>
                <p class="text-sm text-[var(--surface-muted)]">
                  Nachträge:
                  <span class="font-semibold text-[var(--surface-ink)]">{{ trend.editedCount7d }}</span>
                </p>
                <p
                  v-if="trend.latestEmployee && trend.latestLogAt"
                  class="text-sm text-[var(--surface-muted)]"
                >
                  Letzter Eintrag: <span class="font-semibold text-[var(--surface-ink)]">{{ trend.latestEmployee }}</span>
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <section class="content-grid">
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
                v-for="entry in analysis.priorityComments.slice(0, 16)"
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

          <UCard class="surface-card">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="section-title">
                    Warnungs-Feed
                  </h2>
                </div>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :label="`${analysis.warningFeed.length} Einträge`"
                />
              </div>
            </template>

            <div
              v-if="!analysis.warningFeed.length"
              class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
            >
              Kein automatischer Feed vorhanden.
            </div>

            <div
              v-else
              class="space-y-3"
            >
              <div
                v-for="entry in analysis.warningFeed.slice(0, 16)"
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
        </section>
      </template>
    </template>
  </div>
</template>
