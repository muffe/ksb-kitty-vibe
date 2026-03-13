<script setup lang="ts">
import {
  daypartLabel,
  formatDateTime,
  roomDisplayName,
  type RoomLogWithRoom
} from '~/utils/cat-shelter'

defineProps<{
  loading: boolean
  logs: RoomLogWithRoom[]
}>()

const emit = defineEmits<{
  openLog: [log: RoomLogWithRoom]
}>()
</script>

<template>
  <section class="dashboard-support-card space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="section-kicker">
          Arbeitsschritt 3
        </p>
        <h2 class="section-title">
          Zuletzt dokumentiert
        </h2>
      </div>
      <UBadge
        color="neutral"
        variant="subtle"
        :label="`${logs.length} Einträge`"
      />
    </div>

    <div
      v-if="loading"
      class="empty-state"
    >
      Daten werden geladen ...
    </div>

    <div
      v-else-if="!logs.length"
      class="empty-state"
    >
      Noch keine Protokolle vorhanden.
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <button
        v-for="log in logs"
        :key="log.id"
        type="button"
        class="recent-note-row recent-note-row--timeline"
        @click="emit('openLog', log)"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-[var(--surface-ink)]">
            {{ log.room ? roomDisplayName(log.room) : 'Unbekannter Raum' }}
          </p>
          <p class="truncate text-sm text-[var(--surface-muted)]">
            {{ daypartLabel(log.daypart) }} · {{ log.employee_name }} · {{ formatDateTime(log.created_at) }}
          </p>
        </div>

        <p class="line-clamp-1 text-sm text-[var(--surface-muted)]">
          {{ log.comment?.trim() || 'Kein Kommentar hinterlegt.' }}
        </p>
      </button>
    </div>
  </section>
</template>
