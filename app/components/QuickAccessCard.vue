<script setup lang="ts">
import {
  daypartLabel,
  roomDisplayName,
  type Daypart,
  type Room,
  type RoomLogWithRoom
} from '~/utils/cat-shelter'

const emit = defineEmits<{
  openRoom: [room: Room]
  openNext: []
}>()

const props = defineProps<{
  preferredDaypart: Daypart
  rooms: Room[]
  hasRecentOrderChange: boolean
  completedRoomIds: Set<string>
  latestLogByRoom: Map<string, RoomLogWithRoom>
  nextOpenRoom: Room | null
  roundProgress: {
    total: number
    completed: number
    percent: number
  }
}>()

const openRooms = computed(() => props.rooms.filter(room => !props.completedRoomIds.has(room.id)))
const completedRooms = computed(() => props.rooms.filter(room => props.completedRoomIds.has(room.id)))
const queueRooms = computed(() => openRooms.value.filter(room => room.id !== props.nextOpenRoom?.id))
</script>

<template>
  <section class="dashboard-primary space-y-5">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <p class="section-kicker">
          Rundgang
        </p>
        <h2 class="section-title text-2xl">
          {{ props.nextOpenRoom ? 'Jetzt den markierten Raum dokumentieren' : 'Rundgang abgeschlossen' }}
        </h2>
        <p class="text-sm leading-6 text-[var(--surface-muted)]">
          {{ props.nextOpenRoom
            ? `${daypartLabel(props.preferredDaypart)} ist aktiv. Unten ist genau ein Startpunkt markiert.`
            : `Alle Räume für ${daypartLabel(props.preferredDaypart)} sind protokolliert.` }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm font-semibold text-[var(--surface-ink)]">
          {{ props.roundProgress.completed }}/{{ props.roundProgress.total }}
        </span>
        <UBadge
          :color="props.nextOpenRoom ? 'primary' : 'success'"
          variant="subtle"
          :label="props.nextOpenRoom ? 'Start hier' : 'Fertig'"
        />
      </div>
    </div>

    <div
      v-if="props.hasRecentOrderChange"
      class="dashboard-queue-notice"
    >
      Reihenfolge wurde geändert. Bitte den Rundgang strikt nach der Nummerierung fortsetzen.
    </div>

    <div
      v-if="!props.rooms.length"
      class="empty-state"
    >
      Es wurden noch keine Räume angelegt.
    </div>

    <div
      v-else
      class="dashboard-primary__content"
    >
      <div class="dashboard-next-card">
        <div class="dashboard-next-card__header">
          <div class="space-y-2">
            <p class="section-kicker">
              Nächster Raum
            </p>
            <h3 class="section-title text-[clamp(1.7rem,2.2vw,2.4rem)]">
              {{ props.nextOpenRoom ? roomDisplayName(props.nextOpenRoom) : 'Alle Räume erledigt' }}
            </h3>
            <p class="text-sm leading-6 text-[var(--surface-muted)]">
              {{ props.nextOpenRoom
                ? props.nextOpenRoom.warning_info?.trim() || props.latestLogByRoom.get(props.nextOpenRoom.id)?.employee_name || 'Ohne Zusatzinfo'
                : 'Für diese Tageszeit ist kein weiterer Eintrag nötig.' }}
            </p>
          </div>

          <div class="dashboard-next-card__status">
            <div class="dashboard-progress-chip">
              {{ props.roundProgress.completed }}/{{ props.roundProgress.total }}
            </div>
            <div class="quick-progress-bar">
              <div
                class="quick-progress-bar__fill"
                :style="{ '--progress-scale': `${props.roundProgress.percent / 100}` }"
              />
            </div>
          </div>
        </div>

        <div class="dashboard-next-card__actions">
          <UButton
            v-if="props.nextOpenRoom"
            color="primary"
            size="lg"
            icon="i-lucide-arrow-right"
            :label="`Jetzt ${roomDisplayName(props.nextOpenRoom)} öffnen`"
            @click="emit('openNext')"
          />
          <UBadge
            v-else
            color="success"
            variant="subtle"
            label="Rundgang fertig"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            label="Alle Raumdetails"
            to="/raeume"
          />
        </div>
      </div>

      <div class="dashboard-queue">
        <div class="dashboard-queue__header">
          <div>
            <p class="section-kicker">
              Arbeitsschritt 2
            </p>
            <h3 class="section-title text-xl">
              Danach folgen diese Räume
            </h3>
          </div>
          <UBadge
            color="neutral"
            variant="subtle"
            :label="`${queueRooms.length} danach`"
          />
        </div>

        <div class="space-y-2">
          <button
            v-for="room in queueRooms"
            :key="room.id"
            type="button"
            class="quick-room-row quick-room-row--open"
            @click="emit('openRoom', room)"
          >
            <div class="flex min-w-0 items-center gap-4">
              <span class="quick-room-order">
                {{ room.sort_order }}.
              </span>
              <div class="min-w-0">
                <p class="truncate text-base font-semibold text-[var(--surface-ink)]">
                  {{ roomDisplayName(room) }}
                </p>
                <p class="truncate text-sm text-[var(--surface-muted)]">
                  {{ props.latestLogByRoom.get(room.id)?.employee_name || room.warning_info?.trim() || room.description?.trim() || 'Ohne Zusatzinfo' }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2">
              <UBadge
                color="primary"
                variant="subtle"
                label="Offen"
              />
              <UBadge
                v-if="room.warning_info?.trim()"
                color="warning"
                variant="subtle"
                label="Hinweis"
              />
            </div>
          </button>
        </div>
      </div>

      <div
        v-if="completedRooms.length"
        class="dashboard-finished-strip"
      >
        <div class="dashboard-finished-strip__header">
          <p class="section-kicker">
            Bereits erledigt
          </p>
          <UBadge
            color="success"
            variant="subtle"
            :label="`${completedRooms.length} abgeschlossen`"
          />
        </div>

        <div class="dashboard-finished-strip__list">
          <button
            v-for="room in completedRooms"
            :key="room.id"
            type="button"
            class="quick-room-chip"
            @click="emit('openRoom', room)"
          >
            <span class="quick-room-chip__index">{{ room.sort_order }}</span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-[var(--surface-ink)]">
                {{ roomDisplayName(room) }}
              </p>
            </div>
            <UIcon
              name="i-lucide-check"
              class="shrink-0 text-sm text-emerald-700"
            />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
