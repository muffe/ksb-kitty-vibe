<script setup lang="ts">
import type { Daypart, Room, RoomLogInsert, RoomLogWithRoom } from '~/utils/cat-shelter'
import {
  daypartLabel,
  feedingPreview,
  formatDateTime,
  inferredCurrentDaypart,
  roomDisplayName,
  sanitizeRoomLogPayload
} from '~/utils/cat-shelter'

const props = defineProps<{
  room: Room
  logs: RoomLogWithRoom[]
  isAdmin: boolean
  submitting: boolean
  resetToken: number
  initialDaypart?: Daypart
}>()

const emit = defineEmits<{
  'submit-log': [payload: RoomLogInsert]
  'edit-room': [room: Room]
}>()

const defaultDaypart = computed(() => props.initialDaypart ?? inferredCurrentDaypart())
</script>

<template>
  <UCard class="room-card">
    <template #header>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              color="primary"
              variant="soft"
              :label="`Reihenfolge ${room.sort_order}`"
            />
            <UBadge
              v-if="isAdmin"
              color="warning"
              variant="subtle"
              label="Admin-Modus"
            />
          </div>

          <div>
            <h2 class="section-title text-2xl">
              {{ roomDisplayName(room) }}
            </h2>
            <p
              v-if="room.description"
              class="mt-2 max-w-3xl text-sm leading-6 text-[var(--surface-muted)]"
            >
              {{ room.description }}
            </p>
          </div>
        </div>

        <div
          v-if="isAdmin"
          class="flex flex-wrap items-center gap-2 lg:max-w-[18rem] lg:justify-end"
        >
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-pencil-line"
            label="Bearbeiten"
            @click="emit('edit-room', room)"
          />
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <div
        v-if="room.warning_info"
        class="rounded-[1.5rem] border border-amber-300/80 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900"
      >
        <p class="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
          Warnung / Information
        </p>
        <p>{{ room.warning_info }}</p>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <div class="feeding-box">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <p class="section-kicker">
                Futterplan
              </p>
              <h3 class="section-title text-lg">
                Morgens
              </h3>
            </div>
            <UBadge
              color="primary"
              variant="subtle"
              label="Trocken/Nass/Medizin"
            />
          </div>

          <div class="space-y-2 text-sm leading-6 text-[var(--surface-muted)]">
            <p><span class="font-semibold text-[var(--surface-ink)]">Trockenfutter:</span> {{ room.morning_dry_food || 'Keine Angabe' }}</p>
            <p><span class="font-semibold text-[var(--surface-ink)]">Nassfutter:</span> {{ room.morning_wet_food || 'Keine Angabe' }}</p>
            <p><span class="font-semibold text-[var(--surface-ink)]">Medizin:</span> {{ room.morning_medicine || 'Keine Angabe' }}</p>
          </div>
        </div>

        <div class="feeding-box">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <p class="section-kicker">
                Futterplan
              </p>
              <h3 class="section-title text-lg">
                Abends
              </h3>
            </div>
            <UBadge
              color="neutral"
              variant="subtle"
              label="Aktuelle Vorgabe"
            />
          </div>

          <div class="space-y-2 text-sm leading-6 text-[var(--surface-muted)]">
            <p><span class="font-semibold text-[var(--surface-ink)]">Trockenfutter:</span> {{ room.evening_dry_food || 'Keine Angabe' }}</p>
            <p><span class="font-semibold text-[var(--surface-ink)]">Nassfutter:</span> {{ room.evening_wet_food || 'Keine Angabe' }}</p>
            <p><span class="font-semibold text-[var(--surface-ink)]">Medizin:</span> {{ room.evening_medicine || 'Keine Angabe' }}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div class="panel-shell panel-shell--solid panel-block-lg">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="section-kicker">
                Rundgang
              </p>
              <h3 class="section-title text-lg">
                Neues Protokoll erfassen
              </h3>
            </div>
            <UBadge
              color="success"
              variant="subtle"
              label="Für alle zugänglich"
            />
          </div>

          <RoomLogForm
            :submitting="submitting"
            :reset-token="resetToken"
            :initial-daypart="defaultDaypart"
            @submit-log="emit('submit-log', sanitizeRoomLogPayload(room.id, $event))"
          />
        </div>

        <div class="panel-shell panel-block-lg">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="section-kicker">
                Zuletzt passiert
              </p>
              <h3 class="section-title text-lg">
                Neueste Notizen
              </h3>
            </div>
            <span class="text-xs uppercase tracking-[0.22em] text-[var(--surface-muted)]">{{ logs.length }} sichtbar</span>
          </div>

          <div
            v-if="!logs.length"
            class="empty-state"
          >
            Für diesen Raum gibt es noch keine gespeicherten Einträge.
          </div>

          <div
            v-else
            class="space-y-3"
          >
            <div
              v-for="log in logs"
              :key="log.id"
              class="room-log-entry rounded-2xl border border-[var(--surface-line)] bg-white/85 p-4"
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-[var(--surface-ink)]">
                    {{ daypartLabel(log.daypart) }} · {{ log.employee_name }}
                  </p>
                  <p class="text-xs text-[var(--surface-muted)]">
                    {{ formatDateTime(log.created_at) }}
                  </p>
                </div>

                <UBadge
                  :color="log.no_stool_found ? 'warning' : 'success'"
                  variant="subtle"
                  :label="log.no_stool_found ? 'Kein Kot' : 'Kot erfasst'"
                />
              </div>

              <p class="text-sm text-[var(--surface-muted)]">
                {{ log.comment?.trim() || feedingPreview([
                  log.ate_all_food ? 'Futter komplett gefressen' : 'Futter nicht komplett gefressen',
                  log.no_stool_found
                    ? 'Kein Kot gefunden'
                    : `Kotwerte: ${log.stool_firm}/${log.stool_almost_firm}/${log.stool_soft}/${log.stool_mixed}/${log.stool_mushy}/${log.stool_watery}`
                ]) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
