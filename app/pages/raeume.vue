<script setup lang="ts">
import {
  formatDateTime,
  inferredCurrentDaypart,
  sanitizeRoomPayload,
  sortRooms,
  type Daypart,
  type FeedingHistoryEntry,
  type Room,
  type RoomFormState,
  type RoomInsert,
  type RoomLogInsert,
  type RoomLogWithRoom,
  type RoomUpdate
} from '~/utils/cat-shelter'

const supabase = useSupabase()
const adminUser = useAdminUser()
const authReady = useAdminAuthReady()

const rooms = ref<Room[]>([])
const recentLogs = ref<RoomLogWithRoom[]>([])
const loading = ref(true)
const roomModalOpen = ref(false)
const roomModalSaving = ref(false)
const editingRoom = ref<Room | null>(null)
const roomHistory = ref<FeedingHistoryEntry[]>([])
const submittingRoomId = ref<string | null>(null)
const resetTokens = ref<Record<string, number>>({})
const notice = ref<{ tone: 'success' | 'error' | 'info', title: string, description: string } | null>(null)
const preferredDaypart = ref<Daypart>('morning')

const isAdmin = computed(() => Boolean(adminUser.value))
const sortedRooms = computed(() => sortRooms(rooms.value))
const nextSortOrder = computed(() => (sortedRooms.value.at(-1)?.sort_order ?? 0) + 1)

const logsByRoom = computed(() => {
  const grouped = new Map<string, RoomLogWithRoom[]>()

  for (const log of recentLogs.value) {
    const entries = grouped.get(log.room_id) ?? []

    if (entries.length < 3) {
      entries.push(log)
      grouped.set(log.room_id, entries)
    }
  }

  return grouped
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
      .limit(120)
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

async function loadRoomHistory(roomId: string) {
  if (!isAdmin.value) {
    roomHistory.value = []
    return
  }

  const { data, error } = await supabase
    .from('room_feeding_history')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })

  if (error) {
    setNotice('error', 'Die Futterhistorie konnte nicht geladen werden.', error.message)
    roomHistory.value = []
    return
  }

  roomHistory.value = (data ?? []) as FeedingHistoryEntry[]
}

function openCreateRoomModal() {
  editingRoom.value = null
  roomHistory.value = []
  roomModalOpen.value = true
}

async function openEditRoomModal(room: Room) {
  editingRoom.value = room
  await loadRoomHistory(room.id)
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

async function submitRoomLog(payload: RoomLogInsert) {
  submittingRoomId.value = payload.room_id

  const { error } = await supabase
    .from('room_logs')
    .insert(payload)

  if (error) {
    submittingRoomId.value = null
    setNotice('error', 'Der Protokolleintrag konnte nicht gespeichert werden.', error.message)
    return
  }

  resetTokens.value = {
    ...resetTokens.value,
    [payload.room_id]: (resetTokens.value[payload.room_id] ?? 0) + 1
  }

  await refreshAll()
  submittingRoomId.value = null
  setNotice('success', 'Protokoll gespeichert.', 'Der Eintrag ist jetzt im Raumverlauf sichtbar.')
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

onMounted(() => {
  preferredDaypart.value = inferredCurrentDaypart()
  void refreshAll()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
    <section class="top-grid">
      <UCard class="hero-card">
        <div class="space-y-4">
          <div class="space-y-2">
            <p class="section-kicker">
              Raumübersicht
            </p>
            <h1 class="hero-title">
              Alle Räume im Detail
            </h1>
            <p class="hero-copy">
              Hier stehen alle Raumkarten mit Futterplan, Warnhinweisen, aktuellen Protokollen und dem vollständigen Formular.
            </p>
          </div>

          <div class="hint-grid">
            <div class="hint-card">
              <p class="hint-title">
                Empfohlen jetzt
              </p>
              <p class="hint-text">
                {{ preferredDaypart === 'morning' ? 'Morgens' : 'Abends' }}
              </p>
            </div>

            <div class="hint-card">
              <p class="hint-title">
                Letzter Eintrag
              </p>
              <p class="hint-text">
                {{ recentLogs[0] ? formatDateTime(recentLogs[0].created_at) : 'Noch kein Eintrag gespeichert' }}
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="surface-card admin-card">
        <div class="space-y-4">
          <div class="flex flex-wrap gap-3">
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-house"
              label="Zur Startseite"
              to="/"
            />
            <UButton
              color="primary"
              variant="solid"
              icon="i-lucide-list-checks"
              label="Schneller Einstieg"
              to="/#schneller-einstieg"
            />
            <UButton
              v-if="isAdmin"
              color="primary"
              icon="i-lucide-plus"
              label="Neuen Raum anlegen"
              @click="openCreateRoomModal"
            />
          </div>

          <p class="text-sm leading-6 text-[var(--surface-muted)]">
            {{ isAdmin ? 'Admin-Modus aktiv. Räume können direkt aus dieser Ansicht bearbeitet werden.' : 'Normale Raumansicht ohne Verwaltungsfunktionen.' }}
          </p>
        </div>
      </UCard>
    </section>

    <div
      v-if="notice"
      class="status-banner"
      :class="`status-banner--${notice.tone}`"
      :role="notice.tone === 'error' ? 'alert' : 'status'"
      :aria-live="notice.tone === 'error' ? 'assertive' : 'polite'"
    >
      <div>
        <p class="text-sm font-semibold">
          {{ notice.title }}
        </p>
        <p class="mt-1 text-sm opacity-90">
          {{ notice.description }}
        </p>
      </div>
    </div>

    <section class="space-y-5">
      <div
        v-if="loading"
        class="rounded-[1.8rem] border border-dashed border-[var(--surface-line)] bg-white/85 px-6 py-12 text-center text-sm text-[var(--surface-muted)]"
      >
        Räume werden geladen ...
      </div>

      <div
        v-else
        class="space-y-5"
      >
        <RoomCard
          v-for="room in sortedRooms"
          :key="room.id"
          :room="room"
          :logs="logsByRoom.get(room.id) ?? []"
          :is-admin="isAdmin"
          :submitting="submittingRoomId === room.id"
          :reset-token="resetTokens[room.id] ?? 0"
          :initial-daypart="preferredDaypart"
          @edit-room="openEditRoomModal"
          @submit-log="submitRoomLog"
        />
      </div>
    </section>

    <RoomEditorModal
      v-model:open="roomModalOpen"
      :room="editingRoom"
      :history="roomHistory"
      :saving="roomModalSaving"
      :next-sort-order="nextSortOrder"
      @save="saveRoom"
    />
  </div>
</template>
