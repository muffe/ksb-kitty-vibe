<script setup lang="ts">
import type SortableInstance from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
import { roomDisplayName, sortRooms, type Room } from '~/utils/cat-shelter'

const supabase = useSupabase()
const adminUser = useAdminUser()
const authReady = useAdminAuthReady()

const rooms = ref<Room[]>([])
const loading = ref(true)
const saving = ref(false)
const notice = ref<{ tone: 'success' | 'error' | 'info', text: string } | null>(null)
const orderingListRef = ref<HTMLElement | null>(null)

const isAdmin = computed(() => Boolean(adminUser.value))
let sortable: SortableInstance | null = null

async function refreshRooms() {
  loading.value = true

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    loading.value = false
    notice.value = { tone: 'error', text: error.message }
    return
  }

  rooms.value = sortRooms((data ?? []) as Room[])
  loading.value = false
}

function applyRoomMove(oldIndex: number, newIndex: number) {
  if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0) {
    return
  }

  const nextRooms = [...rooms.value]
  const movedRoom = nextRooms.splice(oldIndex, 1)[0]

  if (!movedRoom) {
    return
  }

  nextRooms.splice(newIndex, 0, movedRoom)
  rooms.value = nextRooms
}

function roomIdsAreEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function getRoomIdsFromDom() {
  if (!orderingListRef.value) {
    return []
  }

  return Array.from(orderingListRef.value.querySelectorAll<HTMLElement>('.ordering-row[data-room-id]'))
    .map(element => element.dataset.roomId)
    .filter((value): value is string => Boolean(value))
}

function applyRoomOrderByIds(roomIds: string[]) {
  if (!roomIds.length) {
    return false
  }

  const roomMap = new Map(rooms.value.map(room => [room.id, room]))
  const nextRooms = roomIds
    .map(roomId => roomMap.get(roomId))
    .filter((room): room is Room => Boolean(room))

  if (nextRooms.length !== rooms.value.length) {
    return false
  }

  if (roomIdsAreEqual(rooms.value.map(room => room.id), roomIds)) {
    return false
  }

  rooms.value = nextRooms
  return true
}

function moveRoom(index: number, direction: -1 | 1) {
  const nextIndex = index + direction

  if (saving.value || nextIndex < 0 || nextIndex >= rooms.value.length) {
    return
  }

  applyRoomMove(index, nextIndex)
  void persistOrder('Die Reihenfolge wurde gespeichert.')
}

function handleSortCommit(event: SortableEvent) {
  if (saving.value) {
    return
  }

  const reorderedFromDom = applyRoomOrderByIds(getRoomIdsFromDom())

  if (reorderedFromDom) {
    void persistOrder('Die Reihenfolge wurde aktualisiert.')
    return
  }

  if (event.oldIndex == null || event.newIndex == null || event.oldIndex === event.newIndex) {
    return
  }

  applyRoomMove(event.oldIndex, event.newIndex)
  void persistOrder('Die Reihenfolge wurde aktualisiert.')
}

async function persistOrder(successText: string) {
  if (saving.value) {
    return
  }

  saving.value = true
  notice.value = { tone: 'info', text: 'Reihenfolge wird gespeichert ...' }

  const previousRooms = rooms.value.map(room => ({ ...room }))
  const previousSortOrders = new Map(previousRooms.map(room => [room.id, room.sort_order]))
  const nextRooms = rooms.value.map((room, index) => ({
    ...room,
    sort_order: index + 1
  }))

  rooms.value = nextRooms

  const changedRooms = nextRooms.filter(room => previousSortOrders.get(room.id) !== room.sort_order)

  const results = await Promise.all(
    changedRooms.map(room => (
      supabase
        .from('rooms')
        .update({ sort_order: room.sort_order })
        .eq('id', room.id)
    ))
  )

  const failedUpdate = results.find(result => result.error)

  if (failedUpdate?.error) {
    rooms.value = previousRooms
    saving.value = false
    notice.value = { tone: 'error', text: failedUpdate.error.message }
    await refreshRooms()
    return
  }

  saving.value = false
  notice.value = { tone: 'success', text: successText }
}

async function setupSortable() {
  sortable?.destroy()
  sortable = null

  if (import.meta.server || !isAdmin.value || !orderingListRef.value || rooms.value.length < 2) {
    return
  }

  const { default: Sortable } = await import('sortablejs')

  sortable = Sortable.create(orderingListRef.value, {
    animation: 180,
    direction: 'vertical',
    handle: '.ordering-handle',
    draggable: '.ordering-row',
    chosenClass: 'ordering-row--chosen',
    dragClass: 'ordering-row--dragging',
    ghostClass: 'ordering-row--ghost',
    invertSwap: true,
    swapThreshold: 0.65,
    delayOnTouchOnly: true,
    delay: 120,
    fallbackTolerance: 3,
    touchStartThreshold: 4,
    onEnd: handleSortCommit
  })
}

watch(
  () => adminUser.value?.id,
  async () => {
    if (authReady.value) {
      await refreshRooms()
    }
  }
)

watch(
  () => [isAdmin.value, rooms.value.length] as const,
  async () => {
    await nextTick()
    await setupSortable()
  }
)

watch(saving, (value) => {
  sortable?.option('disabled', value)
})

onMounted(async () => {
  await refreshRooms()
  await nextTick()
  await setupSortable()
})

onBeforeUnmount(() => {
  sortable?.destroy()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="section-kicker">
          Administration
        </p>
        <h1 class="hero-title">
          Raumreihenfolge
        </h1>
        <p class="hero-copy">
          Räume am Griff ziehen oder mit Hoch/Runter verschieben. Änderungen werden sofort gespeichert.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-house"
          label="Zur Startseite"
          to="/"
        />
      </div>
    </div>

    <div
      v-if="notice"
      class="status-banner"
      :class="`status-banner--${notice.tone}`"
      :role="notice.tone === 'error' ? 'alert' : 'status'"
      :aria-live="notice.tone === 'error' ? 'assertive' : 'polite'"
    >
      <p class="text-sm font-semibold">
        {{ notice.text }}
      </p>
    </div>

    <UCard
      v-if="!isAdmin"
      class="surface-card"
    >
      <p class="text-sm leading-6 text-[var(--surface-muted)]">
        Diese Seite ist nur für Admins gedacht. Bitte zuerst auf der Startseite als Admin anmelden.
      </p>
    </UCard>

    <div
      v-else-if="loading"
      class="rounded-[1.8rem] border border-dashed border-[var(--surface-line)] bg-white/85 px-6 py-12 text-center text-sm text-[var(--surface-muted)]"
    >
      Räume werden geladen ...
    </div>

    <div
      v-else
      ref="orderingListRef"
      class="ordering-list"
    >
      <div
        v-for="(room, index) in rooms"
        :key="room.id"
        class="ordering-row"
        :data-room-id="room.id"
      >
        <div class="flex min-w-0 items-center gap-4">
          <button
            type="button"
            class="ordering-handle"
            :disabled="saving"
            aria-label="Zum Verschieben halten und ziehen"
            title="Zum Verschieben halten und ziehen"
          >
            <UIcon
              name="i-lucide-grip-vertical"
              class="text-lg"
            />
          </button>

          <div class="ordering-index">
            {{ index + 1 }}
          </div>
          <div class="min-w-0">
            <h2 class="ordering-title">
              {{ roomDisplayName(room) }}
            </h2>
            <p class="truncate text-sm text-[var(--surface-muted)]">
              {{ room.warning_info?.trim() || room.description?.trim() || 'Keine Zusatzinfo hinterlegt.' }}
            </p>
          </div>
        </div>

        <div class="ordering-actions">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-up"
            label="Hoch"
            class="ordering-arrow"
            aria-label="Nach oben"
            :disabled="index === 0 || saving"
            @click="moveRoom(index, -1)"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-down"
            label="Runter"
            class="ordering-arrow"
            aria-label="Nach unten"
            :disabled="index === rooms.length - 1 || saving"
            @click="moveRoom(index, 1)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
