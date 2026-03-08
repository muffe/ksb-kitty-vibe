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
          :label="`${logs.length} Einträge`"
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
      v-else-if="!logs.length"
      class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-5 text-sm text-[var(--surface-muted)]"
    >
      Noch keine Protokolle vorhanden.
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <button
        v-for="log in logs"
        :key="log.id"
        type="button"
        class="w-full rounded-[1.4rem] border border-[var(--surface-line)] bg-white/85 p-4 text-left transition hover:border-teal-300 hover:shadow-sm"
        @click="emit('openLog', log)"
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
</template>
