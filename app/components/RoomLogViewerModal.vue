<script setup lang="ts">
import type { RoomLogFormState, RoomLogUpdate, RoomLogWithRoom } from '~/utils/cat-shelter'
import {
  daypartLabel,
  formatDateTime,
  roomDisplayName,
  roomLogToFormState,
  sanitizeRoomLogState
} from '~/utils/cat-shelter'

const props = withDefaults(defineProps<{
  open: boolean
  log?: RoomLogWithRoom | null
  submitting: boolean
}>(), {
  log: null
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update-log': [payload: { id: string, roomId: string, values: RoomLogUpdate }]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const resetToken = ref(0)
const editing = ref(false)

const initialState = computed<Partial<RoomLogFormState> | null>(() => (
  props.log ? roomLogToFormState(props.log) : null
))

const initialDaypart = computed(() => (
  props.log?.daypart === 'evening' ? 'evening' : 'morning'
))

const stoolEntries = computed(() => {
  if (!props.log || props.log.no_stool_found) {
    return []
  }

  return [
    { label: 'Fest', value: props.log.stool_firm },
    { label: 'Fast fest', value: props.log.stool_almost_firm },
    { label: 'Weiche Wurst', value: props.log.stool_soft },
    { label: 'Halb/Halb', value: props.log.stool_mixed },
    { label: 'Brei', value: props.log.stool_mushy },
    { label: 'Wässrig', value: props.log.stool_watery }
  ]
})

watch(
  () => [props.open, props.log?.id] as const,
  ([open]) => {
    if (open) {
      editing.value = false
      resetToken.value += 1
    }
  }
)

function submit(state: RoomLogFormState) {
  if (!props.log) {
    return
  }

  emit('update-log', {
    id: props.log.id,
    roomId: props.log.room_id,
    values: sanitizeRoomLogState(state)
  })
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :dismissible="!submitting"
    :ui="{
      content: 'w-[calc(100vw-1rem)] max-w-[860px] rounded-[1.75rem] ring ring-default shadow-2xl',
      header: 'p-4 sm:px-6 lg:px-8',
      body: 'p-4 sm:p-6 lg:p-8',
      footer: 'hidden'
    }"
  >
    <template #header>
      <div
        v-if="log"
        class="flex w-full items-start justify-between gap-4"
      >
        <div>
          <h2 class="section-title text-2xl">
            {{ log.room ? roomDisplayName(log.room) : 'Unbekannter Raum' }}
          </h2>
          <p class="mt-1 text-sm text-[var(--surface-muted)]">
            {{ daypartLabel(log.daypart) }} · {{ formatDateTime(log.created_at) }}
          </p>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Modal schließen"
            :disabled="submitting"
            @click="modalOpen = false"
          />
          <UButton
            v-if="editing"
            color="neutral"
            variant="outline"
            size="sm"
            label="Nur ansehen"
            :disabled="submitting"
            @click="editing = false"
          />
          <UButton
            v-else
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-pencil-line"
            label="Bearbeiten"
            :disabled="submitting"
            @click="editing = true"
          />
        </div>
      </div>
    </template>

    <template #body>
      <div
        v-if="log"
        class="space-y-5"
      >
        <div
          v-if="editing"
          class="rounded-[1.75rem] border border-[var(--surface-line)] bg-white/92 p-5 shadow-sm"
        >
          <RoomLogForm
            :submitting="submitting"
            :reset-token="resetToken"
            :initial-daypart="initialDaypart"
            :initial-state="initialState"
            :show-cancel="true"
            submit-label="Änderungen speichern"
            @cancel="modalOpen = false"
            @submit-log="submit"
          />
        </div>

        <div
          v-else
          class="space-y-4"
        >
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
            <UBadge
              color="neutral"
              variant="subtle"
              :label="log.employee_name"
            />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-[1.4rem] border border-[var(--surface-line)] bg-white/88 p-4">
              <p class="section-kicker">
                Protokoll
              </p>
              <dl class="mt-3 space-y-3 text-sm leading-6">
                <div class="flex items-start justify-between gap-3">
                  <dt class="font-semibold text-[var(--surface-ink)]">
                    Tageszeit
                  </dt>
                  <dd class="text-right text-[var(--surface-muted)]">
                    {{ daypartLabel(log.daypart) }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <dt class="font-semibold text-[var(--surface-ink)]">
                    Mitarbeiter
                  </dt>
                  <dd class="text-right text-[var(--surface-muted)]">
                    {{ log.employee_name }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <dt class="font-semibold text-[var(--surface-ink)]">
                    Futter
                  </dt>
                  <dd class="text-right text-[var(--surface-muted)]">
                    {{ log.ate_all_food ? 'Vollständig gefressen' : 'Nicht vollständig gefressen' }}
                  </dd>
                </div>
              </dl>
            </div>

            <div class="rounded-[1.4rem] border border-[var(--surface-line)] bg-white/88 p-4">
              <p class="section-kicker">
                Kot
              </p>

              <div
                v-if="log.no_stool_found"
                class="mt-3 text-sm leading-6 text-[var(--surface-muted)]"
              >
                Kein Kot gefunden.
              </div>

              <dl
                v-else
                class="mt-3 grid gap-2 sm:grid-cols-2"
              >
                <div
                  v-for="entry in stoolEntries"
                  :key="entry.label"
                  class="rounded-xl bg-[var(--surface-panel)] px-3 py-3"
                >
                  <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--surface-muted)]">
                    {{ entry.label }}
                  </dt>
                  <dd class="mt-1 text-base font-semibold text-[var(--surface-ink)]">
                    {{ entry.value }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div class="rounded-[1.4rem] border border-[var(--surface-line)] bg-white/88 p-4">
            <p class="section-kicker">
              Kommentar
            </p>
            <p class="mt-3 text-sm leading-6 text-[var(--surface-muted)]">
              {{ log.comment?.trim() || 'Kein Kommentar hinterlegt.' }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
