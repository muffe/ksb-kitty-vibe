<script setup lang="ts">
import {
  daypartLabel,
  roomDisplayName,
  type Daypart,
  type Room,
  type RoomLogWithRoom
} from '~/utils/cat-shelter'

defineProps<{
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

const emit = defineEmits<{
  openRoom: [room: Room]
  openNext: []
}>()
</script>

<template>
  <UCard class="surface-card">
    <template #header>
      <div class="space-y-4">
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
              :label="`${rooms.length} Räume`"
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

        <div class="quick-progress-panel">
          <UAlert
            v-if="hasRecentOrderChange"
            color="warning"
            variant="outline"
            icon="i-lucide-triangle-alert"
            title="Reihenfolge kürzlich geändert"
            description="Bitte die aktuelle Raumreihenfolge bewusst beachten und den Rundgang strikt nach der Nummerierung abarbeiten."
            :ui="{
              root: 'mb-4 rounded-[1.2rem] border-amber-300 bg-amber-50 text-amber-950',
              icon: 'text-amber-700',
              title: 'text-sm font-semibold text-amber-950',
              description: 'text-sm leading-6 text-amber-900'
            }"
          />

          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="section-kicker">
                Rundgang
              </p>
              <p class="mt-1 text-base font-semibold text-[var(--surface-ink)]">
                {{ roundProgress.completed }} von {{ roundProgress.total }} Räumen für {{ daypartLabel(preferredDaypart) }} erledigt
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm font-semibold text-[var(--surface-ink)]">
                {{ roundProgress.percent }}%
              </span>
              <UButton
                v-if="nextOpenRoom"
                color="primary"
                size="sm"
                icon="i-lucide-arrow-right"
                :label="`Nächster offener Raum: ${roomDisplayName(nextOpenRoom)}`"
                @click="emit('openNext')"
              />
              <UBadge
                v-else
                color="success"
                variant="subtle"
                label="Alle Räume erledigt"
              />
            </div>
          </div>

          <div class="quick-progress-bar">
            <div
              class="quick-progress-bar__fill"
              :style="{ width: `${roundProgress.percent}%` }"
            />
          </div>
        </div>
      </div>
    </template>

    <div
      v-if="!rooms.length"
      class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
    >
      Es wurden noch keine Räume angelegt.
    </div>

    <div
      v-else
      class="quick-room-grid"
    >
      <button
        v-for="room in rooms"
        :key="room.id"
        type="button"
        class="quick-room-card"
        :class="completedRoomIds.has(room.id) ? 'quick-room-card--done' : 'quick-room-card--open'"
        @click="emit('openRoom', room)"
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

          <div class="flex flex-wrap justify-end gap-2">
            <UBadge
              :color="completedRoomIds.has(room.id) ? 'success' : 'primary'"
              variant="subtle"
              :label="completedRoomIds.has(room.id) ? 'Erledigt' : 'Offen'"
            />
            <UBadge
              v-if="room.warning_info?.trim()"
              color="warning"
              variant="subtle"
              label="Hinweis"
            />
          </div>
        </div>

        <p class="quick-room-copy">
          {{ completedRoomIds.has(room.id)
            ? `${daypartLabel(preferredDaypart)} wurde heute bereits protokolliert.`
            : room.warning_info?.trim() || room.description?.trim() || 'Protokoll direkt aus dieser Übersicht erfassen.' }}
        </p>

        <div class="mt-3 flex flex-wrap gap-3 text-sm text-[var(--surface-muted)]">
          <span v-if="latestLogByRoom.get(room.id)">
            Letzter Mitarbeiter: <span class="font-semibold text-[var(--surface-ink)]">{{ latestLogByRoom.get(room.id)?.employee_name }}</span>
          </span>
          <span v-else>
            Noch kein Protokoll vorhanden
          </span>
        </div>

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
</template>
