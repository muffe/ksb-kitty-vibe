<script setup lang="ts">
import type { FeedingHistoryEntry, Room, RoomFormState } from '~/utils/cat-shelter'
import {
  createRoomFormState,
  daypartLabel,
  feedingPreview,
  formatDateTime,
  roomToFormState
} from '~/utils/cat-shelter'
import { readableInputUi, readableTextareaUi } from '~/utils/ui-presets'

const props = defineProps<{
  open: boolean
  room: Room | null
  history: FeedingHistoryEntry[]
  saving: boolean
  nextSortOrder: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [value: RoomFormState]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const state = reactive(createRoomFormState(props.nextSortOrder))
const localError = ref('')

const morningHistory = computed(() => props.history.filter(entry => entry.daypart === 'morning'))
const eveningHistory = computed(() => props.history.filter(entry => entry.daypart === 'evening'))

watch(
  () => [props.open, props.room, props.nextSortOrder],
  () => {
    const nextState = props.room
      ? roomToFormState(props.room)
      : createRoomFormState(props.nextSortOrder)

    Object.assign(state, nextState)
    localError.value = ''
  },
  { immediate: true }
)

function applyHistoryEntry(entry: FeedingHistoryEntry) {
  if (entry.daypart === 'morning') {
    state.morning_dry_food = entry.dry_food
    state.morning_wet_food = entry.wet_food
    state.morning_medicine = entry.medicine
    return
  }

  state.evening_dry_food = entry.dry_food
  state.evening_wet_food = entry.wet_food
  state.evening_medicine = entry.medicine
}

function submit() {
  if (!state.name.trim()) {
    localError.value = 'Bitte mindestens einen Raumnamen angeben.'
    return
  }

  emit('save', { ...state })
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="room ? 'Raum bearbeiten' : 'Neuen Raum anlegen'"
    :description="room ? 'Pflegehinweise und Futterangaben aktualisieren.' : 'Einen neuen Raum mit allen Pflegeinformationen erfassen.'"
    :dismissible="!saving"
    :ui="{
      content: 'w-[calc(100vw-1.5rem)] max-w-[1180px] rounded-[1.75rem] ring ring-default shadow-2xl',
      header: 'p-4 sm:px-6 lg:px-8 min-h-16',
      body: 'p-4 sm:p-6 lg:p-8',
      footer: 'p-4 sm:px-6 lg:px-8'
    }"
  >
    <template #body>
      <div class="space-y-5">
        <div
          v-if="localError"
          class="rounded-2xl border border-red-300/80 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ localError }}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="field-block">
            <span class="field-label">Name</span>
            <UInput
              v-model="state.name"
              placeholder="z. B. Quarantäne rechts"
              :ui="readableInputUi"
            />
          </label>

          <label class="field-block">
            <span class="field-label">Nummer</span>
            <UInput
              v-model="state.number"
              placeholder="optional"
              :ui="readableInputUi"
            />
          </label>

          <label class="field-block md:col-span-2">
            <span class="field-label">Beschreibung</span>
            <UTextarea
              v-model="state.description"
              :rows="3"
              placeholder="Besonderheiten zum Raum"
              :ui="readableTextareaUi"
            />
          </label>

          <label class="field-block md:col-span-2">
            <span class="field-label">Warnung / Information</span>
            <UTextarea
              v-model="state.warning_info"
              :rows="3"
              placeholder="z. B. ansteckende Erkrankung oder besondere Hygieneregeln"
              :ui="readableTextareaUi"
            />
          </label>
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <UCard class="surface-card">
            <template #header>
              <div>
                <p class="section-kicker">
                  Fütterung
                </p>
                <h3 class="section-title">
                  Morgens
                </h3>
              </div>
            </template>

            <div class="space-y-4">
              <label class="field-block">
                <span class="field-label">Trockenfutter</span>
                <UTextarea
                  v-model="state.morning_dry_food"
                  :rows="2"
                  placeholder="Freitext"
                  :ui="readableTextareaUi"
                />
              </label>

              <label class="field-block">
                <span class="field-label">Nassfutter</span>
                <UTextarea
                  v-model="state.morning_wet_food"
                  :rows="2"
                  placeholder="Freitext"
                  :ui="readableTextareaUi"
                />
              </label>

              <label class="field-block">
                <span class="field-label">Medizin</span>
                <UTextarea
                  v-model="state.morning_medicine"
                  :rows="2"
                  placeholder="Freitext"
                  :ui="readableTextareaUi"
                />
              </label>
            </div>

            <template #footer>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-semibold text-[var(--surface-ink)]">
                    Verlauf
                  </h4>
                  <span class="text-xs text-[var(--surface-muted)]">{{ morningHistory.length }} Einträge</span>
                </div>

                <div
                  v-if="!morningHistory.length"
                  class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-3 text-sm text-[var(--surface-muted)]"
                >
                  Noch keine gespeicherten Morgenangaben vorhanden.
                </div>

                <div
                  v-else
                  class="space-y-3"
                >
                  <div
                    v-for="entry in morningHistory"
                    :key="entry.id"
                    class="rounded-2xl border border-[var(--surface-line)] bg-white/85 p-4"
                  >
                    <div class="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--surface-muted)]">
                          {{ daypartLabel(entry.daypart) }}
                        </p>
                        <p class="text-sm font-semibold text-[var(--surface-ink)]">
                          {{ formatDateTime(entry.created_at) }}
                        </p>
                      </div>

                      <UButton
                        color="neutral"
                        variant="outline"
                        size="sm"
                        label="Übernehmen"
                        @click="applyHistoryEntry(entry)"
                      />
                    </div>

                    <p class="text-sm text-[var(--surface-muted)]">
                      {{ feedingPreview([entry.dry_food, entry.wet_food, entry.medicine]) }}
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </UCard>

          <UCard class="surface-card">
            <template #header>
              <div>
                <p class="section-kicker">
                  Fütterung
                </p>
                <h3 class="section-title">
                  Abends
                </h3>
              </div>
            </template>

            <div class="space-y-4">
              <label class="field-block">
                <span class="field-label">Trockenfutter</span>
                <UTextarea
                  v-model="state.evening_dry_food"
                  :rows="2"
                  placeholder="Freitext"
                  :ui="readableTextareaUi"
                />
              </label>

              <label class="field-block">
                <span class="field-label">Nassfutter</span>
                <UTextarea
                  v-model="state.evening_wet_food"
                  :rows="2"
                  placeholder="Freitext"
                  :ui="readableTextareaUi"
                />
              </label>

              <label class="field-block">
                <span class="field-label">Medizin</span>
                <UTextarea
                  v-model="state.evening_medicine"
                  :rows="2"
                  placeholder="Freitext"
                  :ui="readableTextareaUi"
                />
              </label>
            </div>

            <template #footer>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-semibold text-[var(--surface-ink)]">
                    Verlauf
                  </h4>
                  <span class="text-xs text-[var(--surface-muted)]">{{ eveningHistory.length }} Einträge</span>
                </div>

                <div
                  v-if="!eveningHistory.length"
                  class="rounded-2xl border border-dashed border-[var(--surface-line)] px-4 py-3 text-sm text-[var(--surface-muted)]"
                >
                  Noch keine gespeicherten Abendangaben vorhanden.
                </div>

                <div
                  v-else
                  class="space-y-3"
                >
                  <div
                    v-for="entry in eveningHistory"
                    :key="entry.id"
                    class="rounded-2xl border border-[var(--surface-line)] bg-white/85 p-4"
                  >
                    <div class="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--surface-muted)]">
                          {{ daypartLabel(entry.daypart) }}
                        </p>
                        <p class="text-sm font-semibold text-[var(--surface-ink)]">
                          {{ formatDateTime(entry.created_at) }}
                        </p>
                      </div>

                      <UButton
                        color="neutral"
                        variant="outline"
                        size="sm"
                        label="Übernehmen"
                        @click="applyHistoryEntry(entry)"
                      />
                    </div>

                    <p class="text-sm text-[var(--surface-muted)]">
                      {{ feedingPreview([entry.dry_food, entry.wet_food, entry.medicine]) }}
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="outline"
          label="Abbrechen"
          :disabled="saving"
          @click="modalOpen = false"
        />
        <UButton
          color="primary"
          :loading="saving"
          :label="room ? 'Änderungen speichern' : 'Raum anlegen'"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
