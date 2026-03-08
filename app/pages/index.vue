<script setup lang="ts">
import {
  daypartLabel,
  formatDateTime,
  inferredCurrentDaypart,
  isSameCalendarDay,
  roomDisplayName,
  sanitizeRoomPayload,
  sortRooms,
  type Daypart,
  type RoomFormState,
  type FeedingHistoryEntry,
  type Room,
  type RoomInsert,
  type RoomLogInsert,
  type RoomLogUpdate,
  type RoomLogWithRoom,
  type RoomUpdate
} from '~/utils/cat-shelter'
import { readableInputUi } from '~/utils/ui-presets'

const supabase = useSupabase()
const adminUser = useAdminUser()
const authReady = useAdminAuthReady()

const rooms = ref<Room[]>([])
const recentLogs = ref<RoomLogWithRoom[]>([])
const loading = ref(true)
const roomModalOpen = ref(false)
const loginModalOpen = ref(false)
const roomModalSaving = ref(false)
const loginPending = ref(false)
const editingRoom = ref<Room | null>(null)
const roomHistory = ref<FeedingHistoryEntry[]>([])
const submittingRoomId = ref<string | null>(null)
const notice = ref<{ tone: 'success' | 'error' | 'info', title: string, description: string } | null>(null)
const loginError = ref('')
const quickProtocolOpen = ref(false)
const quickProtocolRoom = ref<Room | null>(null)
const logViewerOpen = ref(false)
const selectedLog = ref<RoomLogWithRoom | null>(null)
const preferredDaypart = ref<Daypart>('morning')

const loginState = reactive({
  email: '',
  password: ''
})

const isAdmin = computed(() => Boolean(adminUser.value))

const sortedRooms = computed(() => sortRooms(rooms.value))

const nextSortOrder = computed(() => (sortedRooms.value.at(-1)?.sort_order ?? 0) + 1)
const latestDashboardLogs = computed(() => recentLogs.value.slice(0, 8))

const todayLogCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return recentLogs.value.filter(log => new Date(log.created_at) >= today).length
})

const warningCount = computed(() =>
  rooms.value.filter(room => room.warning_info?.trim()).length
)

const completedRoomIds = computed(() => {
  const today = new Date()

  return new Set(
    recentLogs.value
      .filter(log => log.daypart === preferredDaypart.value && isSameCalendarDay(log.created_at, today))
      .map(log => log.room_id)
  )
})

const completedCount = computed(() => completedRoomIds.value.size)

const existingLogsByRoom = computed(() => {
  const today = new Date()
  const entries = new Map<string, RoomLogWithRoom>()

  for (const log of recentLogs.value) {
    if (entries.has(log.room_id)) {
      continue
    }

    if (log.daypart !== preferredDaypart.value || !isSameCalendarDay(log.created_at, today)) {
      continue
    }

    entries.set(log.room_id, log)
  }

  return entries
})

async function refreshAll() {
  loading.value = true

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
        room:rooms(name, number)
      `)
      .order('created_at', { ascending: false })
      .limit(80)
  ])

  if (roomsResult.error) {
    loading.value = false
    setNotice('error', 'Räume konnten nicht geladen werden.', roomsResult.error.message)
    return
  }

  if (logsResult.error) {
    loading.value = false
    setNotice('error', 'Protokolle konnten nicht geladen werden.', logsResult.error.message)
    return
  }

  rooms.value = (roomsResult.data ?? []) as Room[]
  recentLogs.value = (logsResult.data ?? []) as RoomLogWithRoom[]
  loading.value = false
}

function openCreateRoomModal() {
  editingRoom.value = null
  roomHistory.value = []
  roomModalOpen.value = true
}

async function saveRoom(state: RoomFormState) {
  roomModalSaving.value = true
  const wasEditing = Boolean(editingRoom.value)
  let error: Error | null = null

  if (editingRoom.value) {
    const response = await supabase
      .from('rooms')
      .update(sanitizeRoomPayload(state) as RoomUpdate)
      .eq('id', editingRoom.value.id)

    error = response.error
  } else {
    const response = await supabase
      .from('rooms')
      .insert(sanitizeRoomPayload(state) as RoomInsert)

    error = response.error
  }

  if (error) {
    roomModalSaving.value = false
    setNotice('error', 'Der Raum konnte nicht gespeichert werden.', error.message)
    return
  }

  await refreshAll()
  await normalizeRoomOrder()

  roomModalSaving.value = false
  roomModalOpen.value = false
  editingRoom.value = null
  roomHistory.value = []

  setNotice(
    'success',
    wasEditing ? 'Raum aktualisiert.' : 'Raum angelegt.',
    'Die Änderungen wurden in Supabase gespeichert.'
  )
}

async function normalizeRoomOrder(orderOverride?: Room[]) {
  const orderedRooms = orderOverride ?? [...sortedRooms.value]

  for (const [index, room] of orderedRooms.entries()) {
    const expectedOrder = index + 1

    if (room.sort_order === expectedOrder) {
      continue
    }

    const { error } = await supabase
      .from('rooms')
      .update({ sort_order: expectedOrder })
      .eq('id', room.id)

    if (error) {
      setNotice('error', 'Die Reihenfolge konnte nicht aktualisiert werden.', error.message)
      return
    }
  }

  await refreshAll()
}

function openQuickProtocol(room: Room) {
  quickProtocolRoom.value = room
  quickProtocolOpen.value = true
}

function openLogViewer(log: RoomLogWithRoom) {
  selectedLog.value = log
  logViewerOpen.value = true
}

async function submitRoomLog(payload: RoomLogInsert) {
  submittingRoomId.value = payload.room_id

  const { error } = await supabase
    .from('room_logs')
    .insert(payload)

  if (error) {
    submittingRoomId.value = null
    setNotice('error', 'Der Protokolleintrag konnte nicht gespeichert werden.', error.message)
    return false
  }

  await refreshAll()
  submittingRoomId.value = null
  quickProtocolOpen.value = false
  quickProtocolRoom.value = null

  setNotice('success', 'Protokoll gespeichert.', 'Der Eintrag ist jetzt im Raumverlauf sichtbar.')
  return true
}

async function updateRoomLog(id: string, roomId: string, values: RoomLogUpdate) {
  submittingRoomId.value = roomId

  const { error } = await supabase
    .from('room_logs')
    .update(values)
    .eq('id', id)

  if (error) {
    submittingRoomId.value = null
    setNotice('error', 'Das Protokoll konnte nicht aktualisiert werden.', error.message)
    return false
  }

  await refreshAll()
  submittingRoomId.value = null
  quickProtocolOpen.value = false
  quickProtocolRoom.value = null
  logViewerOpen.value = false
  selectedLog.value = null

  setNotice('success', 'Protokoll aktualisiert.', 'Der vorhandene Eintrag wurde gespeichert.')
  return true
}

async function signInAdmin() {
  loginPending.value = true
  loginError.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: loginState.email.trim(),
    password: loginState.password
  })

  if (error) {
    loginPending.value = false
    loginError.value = error.message
    return
  }

  loginPending.value = false
  loginModalOpen.value = false
  loginState.email = ''
  loginState.password = ''
  await refreshAll()

  setNotice('success', 'Admin-Login aktiv.', 'Sie können jetzt Räume bearbeiten und Futterhistorien einsehen.')
}

async function signOutAdmin() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    setNotice('error', 'Abmeldung fehlgeschlagen.', error.message)
    return
  }

  await refreshAll()
  setNotice('info', 'Admin abgemeldet.', 'Die Oberfläche läuft wieder im normalen Mitarbeitenden-Modus.')
}

function setNotice(tone: 'success' | 'error' | 'info', title: string, description: string) {
  notice.value = { tone, title, description }
}

watch(roomModalOpen, (value) => {
  if (!value) {
    editingRoom.value = null
    roomHistory.value = []
  }
})

watch(
  () => adminUser.value?.id,
  async () => {
    if (authReady.value) {
      await refreshAll()
    }
  }
)

onMounted(refreshAll)
onMounted(() => {
  preferredDaypart.value = inferredCurrentDaypart()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
    <section
      v-if="isAdmin"
      class="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]"
    >
      <UCard class="hero-card surface-card">
        <div class="space-y-5">
          <div class="space-y-2">
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
      </UCard>

      <UCard class="surface-card admin-card">
        <div class="space-y-4">
          <div>
            <h2 class="section-title">
              Admin-Zugang
            </h2>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <UButton
              color="primary"
              icon="i-lucide-plus"
              label="Neuen Raum anlegen"
              class="justify-center"
              @click="openCreateRoomModal"
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
              class="sm:col-span-2 justify-center"
              @click="signOutAdmin"
            />
          </div>
        </div>
      </UCard>
    </section>

    <section
      v-else
      class="space-y-3"
    >
      <div class="flex justify-end">
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-lock-keyhole"
          label="Admin-Login"
          @click="loginModalOpen = true"
        />
      </div>

      <UCard class="hero-card">
        <div class="space-y-5">
          <div class="space-y-2">
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
      </UCard>
    </section>

    <div
      v-if="notice"
      class="status-banner"
      :class="`status-banner--${notice.tone}`"
    >
      <div>
        <p class="text-sm font-semibold">
          {{ notice.title }}
        </p>
        <p class="mt-1 text-sm opacity-90">
          {{ notice.description }}
        </p>
      </div>

      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        aria-label="Hinweis schließen"
        @click="notice = null"
      />
    </div>

    <section class="stats-grid">
      <UCard class="stat-card">
        <p class="section-kicker">
          Räume
        </p>
        <p class="stat-value">
          {{ rooms.length }}
        </p>
        <p class="stat-copy">
          aktive Räume im aktuellen Ablauf
        </p>
      </UCard>

      <UCard class="stat-card">
        <p class="section-kicker">
          Warnhinweise
        </p>
        <p class="stat-value">
          {{ warningCount }}
        </p>
        <p class="stat-copy">
          Räume mit besonderen Risiken oder Infos
        </p>
      </UCard>

      <UCard class="stat-card">
        <p class="section-kicker">
          Einträge heute
        </p>
        <p class="stat-value">
          {{ todayLogCount }}
        </p>
        <p class="stat-copy">
          Protokolle seit Mitternacht
        </p>
      </UCard>

      <UCard class="stat-card">
        <p class="section-kicker">
          {{ daypartLabel(preferredDaypart) }}
        </p>
        <p class="stat-value">
          {{ completedCount }}
        </p>
        <p class="stat-copy">
          Räume heute bereits protokolliert
        </p>
      </UCard>
    </section>

    <section
      id="schneller-einstieg"
      class="content-grid"
    >
      <UCard class="surface-card">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="section-title">
                Schneller Einstieg
              </h2>
              <p class="mt-1 text-sm text-[var(--surface-muted)]">
                Aktuell empfohlen: {{ daypartLabel(preferredDaypart) }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                color="primary"
                variant="subtle"
                :label="`${sortedRooms.length} Räume`"
              />
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-panels-top-left"
                label="Raumdetails"
                to="/raeume"
              />
            </div>
          </div>
        </template>

        <div
          v-if="!sortedRooms.length"
          class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
        >
          Es wurden noch keine Räume angelegt.
        </div>

        <div
          v-else
          class="quick-room-grid"
        >
          <button
            v-for="room in sortedRooms"
            :key="room.id"
            type="button"
            class="quick-room-card"
            :class="completedRoomIds.has(room.id) ? 'quick-room-card--done' : 'quick-room-card--open'"
            @click="openQuickProtocol(room)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="quick-room-order">
                  {{ room.sort_order }}.
                </p>
                <h3 class="quick-room-title">
                  {{ roomDisplayName(room) }}
                </h3>
              </div>

              <UBadge
                :color="completedRoomIds.has(room.id) ? 'success' : room.warning_info?.trim() ? 'warning' : 'primary'"
                variant="subtle"
                :label="completedRoomIds.has(room.id) ? 'Erledigt' : room.warning_info?.trim() ? 'Hinweis' : 'Offen'"
              />
            </div>

            <p class="quick-room-copy">
              {{ completedRoomIds.has(room.id)
                ? `${daypartLabel(preferredDaypart)} wurde heute bereits protokolliert.`
                : room.warning_info?.trim() || room.description?.trim() || 'Protokoll direkt aus dieser Übersicht erfassen.' }}
            </p>

            <div class="mt-4 flex items-center justify-between gap-3">
              <span class="text-sm font-semibold text-[var(--surface-ink)]">
                {{ completedRoomIds.has(room.id) ? 'Erneut öffnen' : 'Protokoll öffnen' }}
              </span>
              <UIcon
                name="i-lucide-arrow-down-right"
                class="text-lg text-[var(--surface-muted)]"
              />
            </div>
          </button>
        </div>
      </UCard>

      <UCard class="surface-card">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="section-title">
                Letzte Notizen
              </h2>
            </div>
            <UBadge
              color="neutral"
              variant="subtle"
              :label="`${latestDashboardLogs.length} Einträge`"
            />
          </div>
        </template>

        <div
          v-if="loading"
          class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
        >
          Daten werden geladen ...
        </div>

        <div
          v-else-if="!latestDashboardLogs.length"
          class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
        >
          Noch keine Protokolle vorhanden.
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <button
            v-for="log in latestDashboardLogs"
            :key="log.id"
            type="button"
            class="w-full rounded-[1.4rem] border border-[var(--surface-line)] bg-white/85 p-4 text-left transition hover:border-teal-300 hover:shadow-sm"
            @click="openLogViewer(log)"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="text-sm font-semibold text-[var(--surface-ink)]">
                  {{ log.room ? roomDisplayName(log.room) : 'Unbekannter Raum' }}
                </p>
                <p class="mt-1 text-sm text-[var(--surface-muted)]">
                  {{ daypartLabel(log.daypart) }} · {{ log.employee_name }} · {{ formatDateTime(log.created_at) }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UBadge
                  :color="log.ate_all_food ? 'success' : 'warning'"
                  variant="subtle"
                  :label="log.ate_all_food ? 'Futter komplett' : 'Futter nicht komplett'"
                />
                <UBadge
                  :color="log.no_stool_found ? 'warning' : 'success'"
                  variant="subtle"
                  :label="log.no_stool_found ? 'Kein Kot' : 'Kot erfasst'"
                />
              </div>
            </div>

            <p class="mt-3 text-sm leading-6 text-[var(--surface-muted)]">
              {{ log.comment?.trim() || 'Kein Kommentar hinterlegt.' }}
            </p>
          </button>
        </div>
      </UCard>
    </section>

    <RoomEditorModal
      v-model:open="roomModalOpen"
      :room="editingRoom"
      :history="roomHistory"
      :saving="roomModalSaving"
      :next-sort-order="nextSortOrder"
      @save="saveRoom"
    />

    <RoomProtocolModal
      v-model:open="quickProtocolOpen"
      :room="quickProtocolRoom"
      :submitting="submittingRoomId === quickProtocolRoom?.id"
      :initial-daypart="preferredDaypart"
      :completed="quickProtocolRoom ? completedRoomIds.has(quickProtocolRoom.id) : false"
      :existing-log="quickProtocolRoom ? existingLogsByRoom.get(quickProtocolRoom.id) ?? null : null"
      @create-log="submitRoomLog"
      @update-log="updateRoomLog($event.id, quickProtocolRoom?.id ?? '', $event.values)"
    />

    <RoomLogViewerModal
      v-model:open="logViewerOpen"
      :log="selectedLog"
      :submitting="submittingRoomId === selectedLog?.room_id"
      @update-log="updateRoomLog($event.id, $event.roomId, $event.values)"
    />

    <UModal
      v-model:open="loginModalOpen"
      :dismissible="!loginPending"
    >
      <template #header>
        <div class="flex w-full items-start justify-between gap-4">
          <div>
            <h2 class="section-title text-2xl">
              Admin-Anmeldung
            </h2>
            <p class="mt-1 text-sm text-[var(--surface-muted)]">
              Nur für verwaltende Konten mit Supabase-E-Mail/Passwort.
            </p>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Modal schließen"
            :disabled="loginPending"
            @click="loginModalOpen = false"
          />
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <div
            v-if="loginError"
            class="rounded-2xl border border-red-300/80 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ loginError }}
          </div>

          <label class="field-block">
            <span class="field-label">E-Mail</span>
            <UInput
              v-model="loginState.email"
              type="email"
              placeholder="admin@beispiel.de"
              :ui="readableInputUi"
            />
          </label>

          <label class="field-block">
            <span class="field-label">Passwort</span>
            <UInput
              v-model="loginState.password"
              type="password"
              placeholder="Passwort"
              :ui="readableInputUi"
            />
          </label>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
          <UButton
            color="neutral"
            variant="outline"
            label="Abbrechen"
            :disabled="loginPending"
            @click="loginModalOpen = false"
          />
          <UButton
            color="primary"
            :loading="loginPending"
            label="Anmelden"
            @click="signInAdmin"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
