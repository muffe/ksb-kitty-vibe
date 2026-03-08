<script setup lang="ts">
import {
  inferredCurrentDaypart,
  isSameCalendarDay,
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
  password: ''
})

const isAdmin = computed(() => Boolean(adminUser.value))

const sortedRooms = computed(() => sortRooms(rooms.value))

const nextSortOrder = computed(() => (sortedRooms.value.at(-1)?.sort_order ?? 0) + 1)
const latestDashboardLogs = computed(() => recentLogs.value.slice(0, 8))

const completedRoomIds = computed(() => {
  const today = new Date()

  return new Set(
    recentLogs.value
      .filter(log => log.daypart === preferredDaypart.value && isSameCalendarDay(log.created_at, today))
      .map(log => log.room_id)
  )
})

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

const latestLogByRoom = computed(() => {
  const entries = new Map<string, RoomLogWithRoom>()

  for (const log of recentLogs.value) {
    if (!entries.has(log.room_id)) {
      entries.set(log.room_id, log)
    }
  }

  return entries
})

const nextOpenRoom = computed(() => sortedRooms.value.find(room => !completedRoomIds.value.has(room.id)) ?? null)

const roundProgress = computed(() => {
  const total = sortedRooms.value.length
  const completed = completedRoomIds.value.size

  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0
  }
})

const daypartCompletion = computed(() => {
  const today = new Date()
  const morningRooms = new Set<string>()
  const eveningRooms = new Set<string>()

  for (const log of recentLogs.value) {
    if (!isSameCalendarDay(log.created_at, today)) {
      continue
    }

    if (log.daypart === 'morning') {
      morningRooms.add(log.room_id)
      continue
    }

    if (log.daypart === 'evening') {
      eveningRooms.add(log.room_id)
    }
  }

  return {
    morningCount: morningRooms.size,
    eveningCount: eveningRooms.size
  }
})

function formatRoomCompletion(count: number) {
  if (!rooms.value.length) {
    return '0%'
  }

  return `${Math.round((count / rooms.value.length) * 100)}%`
}

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

function openNextOpenRoom() {
  if (nextOpenRoom.value) {
    openQuickProtocol(nextOpenRoom.value)
  }
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

  try {
    const session = await $fetch<{ access_token: string, refresh_token: string }>('/api/admin/login', {
      method: 'POST',
      body: {
        password: loginState.password
      }
    })

    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    })

    if (error) {
      loginPending.value = false
      loginError.value = error.message
      return
    }
  } catch (error) {
    loginPending.value = false
    loginError.value = error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.'
    return
  }

  loginPending.value = false
  loginModalOpen.value = false
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
    <section v-if="isAdmin">
      <DashboardHeroCard
        is-admin
        :rooms-count="rooms.length"
        :morning-completion="formatRoomCompletion(daypartCompletion.morningCount)"
        :morning-count="daypartCompletion.morningCount"
        :evening-completion="formatRoomCompletion(daypartCompletion.eveningCount)"
        :evening-count="daypartCompletion.eveningCount"
        @create-room="openCreateRoomModal"
        @sign-out="signOutAdmin"
      />
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

      <DashboardHeroCard />
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

    <section
      id="schneller-einstieg"
      class="content-grid"
    >
      <QuickAccessCard
        :preferred-daypart="preferredDaypart"
        :rooms="sortedRooms"
        :completed-room-ids="completedRoomIds"
        :latest-log-by-room="latestLogByRoom"
        :next-open-room="nextOpenRoom"
        :round-progress="roundProgress"
        @open-room="openQuickProtocol"
        @open-next="openNextOpenRoom"
      />

      <RecentNotesCard
        :loading="loading"
        :logs="latestDashboardLogs"
        @open-log="openLogViewer"
      />
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

    <AdminLoginModal
      v-model:open="loginModalOpen"
      v-model:password="loginState.password"
      :pending="loginPending"
      :error="loginError"
      @submit="signInAdmin"
    />
  </div>
</template>
