<script setup lang="ts">
import type {
  Daypart,
  Room,
  RoomLogFormState,
  RoomLogInsert,
  RoomLogUpdate,
  RoomLogWithRoom
} from '~/utils/cat-shelter'
import {
  daypartLabel,
  formatDateTime,
  roomDisplayName,
  roomLogToFormState,
  sanitizeRoomLogPayload,
  sanitizeRoomLogState
} from '~/utils/cat-shelter'

const props = withDefaults(defineProps<{
  open: boolean
  room?: Room | null
  submitting: boolean
  initialDaypart: Daypart
  completed: boolean
  existingLog?: RoomLogWithRoom | null
}>(), {
  room: null,
  existingLog: null
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'create-log': [payload: RoomLogInsert]
  'update-log': [payload: { id: string, values: RoomLogUpdate }]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const resetToken = ref(0)
const mode = ref<'choice' | 'edit' | 'new'>('new')

const hasSecondaryInfo = computed(() => {
  if (!props.room) {
    return false
  }

  return Boolean(
    props.room.description?.trim()
    || feedingPlans.value.alternate.entries.some(entry => entry.value !== 'Keine Angabe')
  )
})

const formInitialState = computed<Partial<RoomLogFormState> | null>(() => (
  mode.value === 'edit' && props.existingLog
    ? roomLogToFormState(props.existingLog)
    : null
))

const formSubmitLabel = computed(() => mode.value === 'edit' ? 'Änderungen speichern' : 'Protokoll speichern')

const feedingPlans = computed(() => {
  if (!props.room) {
    return {
      current: {
        label: daypartLabel(props.initialDaypart),
        entries: [] as { label: string, value: string }[]
      },
      alternate: {
        label: daypartLabel(props.initialDaypart === 'morning' ? 'evening' : 'morning'),
        entries: [] as { label: string, value: string }[]
      }
    }
  }

  const morningEntries = [
    { label: 'Trockenfutter', value: props.room.morning_dry_food || 'Keine Angabe' },
    { label: 'Nassfutter', value: props.room.morning_wet_food || 'Keine Angabe' },
    { label: 'Medizin', value: props.room.morning_medicine || 'Keine Angabe' }
  ]

  const eveningEntries = [
    { label: 'Trockenfutter', value: props.room.evening_dry_food || 'Keine Angabe' },
    { label: 'Nassfutter', value: props.room.evening_wet_food || 'Keine Angabe' },
    { label: 'Medizin', value: props.room.evening_medicine || 'Keine Angabe' }
  ]

  return props.initialDaypart === 'morning'
    ? {
        current: { label: 'Morgens', entries: morningEntries },
        alternate: { label: 'Abends', entries: eveningEntries }
      }
    : {
        current: { label: 'Abends', entries: eveningEntries },
        alternate: { label: 'Morgens', entries: morningEntries }
      }
})

watch(
  () => [props.open, props.room?.id, props.initialDaypart, props.existingLog?.id] as const,
  ([open]) => {
    if (open) {
      mode.value = props.existingLog ? 'choice' : 'new'
      resetToken.value += 1
    }
  }
)

function setMode(nextMode: 'choice' | 'edit' | 'new') {
  mode.value = nextMode
  resetToken.value += 1
}

function submitLog(state: RoomLogFormState) {
  if (!props.room) {
    return
  }

  if (mode.value === 'edit' && props.existingLog) {
    emit('update-log', {
      id: props.existingLog.id,
      values: sanitizeRoomLogState(state)
    })
    return
  }

  emit('create-log', sanitizeRoomLogPayload(props.room.id, state))
}
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :dismissible="!submitting"
    :ui="{
      content: 'w-[calc(100vw-1rem)] max-w-[1040px] rounded-[1.75rem] ring ring-default shadow-2xl',
      header: 'p-4 sm:px-6 lg:px-8',
      body: 'p-4 sm:p-6 lg:p-8',
      footer: 'hidden'
    }"
  >
    <template #header>
      <div
        v-if="room"
        class="flex w-full items-start justify-between gap-4"
      >
        <div class="min-w-0 flex-1">
          <div
            class="grid w-full gap-y-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-x-4 md:items-center"
          >
            <div class="flex min-h-10 items-center text-left">
              <h2 class="section-title text-2xl">
                {{ roomDisplayName(room) }}
              </h2>
            </div>

            <div
              v-if="room.warning_info"
              class="flex justify-center md:col-start-2 md:self-center md:justify-self-center"
            >
              <div class="inline-flex max-w-[18rem] items-center gap-2 rounded-full border border-amber-300/90 bg-amber-100 px-3 py-1 text-amber-950 shadow-sm">
                <UIcon
                  name="i-lucide-triangle-alert"
                  class="text-sm text-amber-700"
                />
                <span class="text-xs font-semibold leading-5 sm:text-sm">
                  {{ room.warning_info }}
                </span>
              </div>
            </div>

            <div
              aria-hidden="true"
              class="hidden md:block"
            />
          </div>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          aria-label="Modal schließen"
          :disabled="submitting"
          @click="modalOpen = false"
        />
      </div>
    </template>

    <template #body>
      <div
        v-if="room"
        class="space-y-3"
      >
        <div class="grid gap-5 lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)] lg:items-start">
          <aside class="space-y-4">
            <div class="rounded-[1.5rem] border border-teal-200 bg-teal-50/80 p-4">
              <p class="section-kicker">
                Jetzt wichtig
              </p>
              <h3 class="section-title mt-1 text-xl">
                Futterplan {{ feedingPlans.current.label }}
              </h3>

              <dl class="mt-4 space-y-3">
                <div
                  v-for="entry in feedingPlans.current.entries"
                  :key="entry.label"
                  class="rounded-[1rem] bg-white/85 px-3 py-3"
                >
                  <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--surface-muted)]">
                    {{ entry.label }}
                  </dt>
                  <dd class="mt-1 text-sm leading-6 text-[var(--surface-ink)]">
                    {{ entry.value }}
                  </dd>
                </div>
              </dl>
            </div>

            <div
              v-if="hasSecondaryInfo"
              class="rounded-[1.4rem] border border-[var(--surface-line)] bg-[var(--surface-panel)]"
            >
              <div class="px-4 py-3 text-sm font-semibold text-[var(--surface-ink)]">
                Weitere Informationen
              </div>

              <div class="space-y-4 border-t border-[var(--surface-line)] px-4 py-4">
                <div v-if="room.description">
                  <p class="section-kicker">
                    Zum Raum
                  </p>
                  <p class="mt-2 text-sm leading-6 text-[var(--surface-muted)]">
                    {{ room.description }}
                  </p>
                </div>

                <div>
                  <p class="section-kicker">
                    Andere Tageszeit
                  </p>
                  <h3 class="section-title mt-1 text-lg">
                    {{ feedingPlans.alternate.label }}
                  </h3>

                  <dl class="mt-3 space-y-2">
                    <div
                      v-for="entry in feedingPlans.alternate.entries"
                      :key="entry.label"
                      class="grid gap-1 text-sm leading-6 sm:grid-cols-[7.5rem_minmax(0,1fr)]"
                    >
                      <dt class="font-semibold text-[var(--surface-ink)]">
                        {{ entry.label }}
                      </dt>
                      <dd class="text-[var(--surface-muted)]">
                        {{ entry.value }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </aside>

          <div class="rounded-[1.75rem] border border-[var(--surface-line)] bg-white/92 p-5 shadow-sm lg:p-6">
            <div class="mb-5 border-b border-[var(--surface-line)] pb-4">
              <div class="mb-3 flex flex-wrap items-center justify-end gap-2">
                <UBadge
                  color="primary"
                  variant="soft"
                  :label="`Reihenfolge ${room.sort_order}`"
                />
                <UBadge
                  :color="completed ? 'success' : 'warning'"
                  variant="subtle"
                  :label="completed ? `${daypartLabel(initialDaypart)} bereits protokolliert` : `${daypartLabel(initialDaypart)} noch offen`"
                />
              </div>

              <p class="section-kicker">
                Rundgang
              </p>
              <h3 class="section-title mt-1 text-xl">
                Protokoll erfassen
              </h3>
              <p
                v-if="mode === 'edit' && existingLog"
                class="mt-2 text-sm leading-6 text-[var(--surface-muted)]"
              >
                Vorhandenes Protokoll von {{ existingLog.employee_name }} vom {{ formatDateTime(existingLog.created_at) }} bearbeiten.
              </p>
              <p
                v-else-if="mode === 'new' && existingLog"
                class="mt-2 text-sm leading-6 text-[var(--surface-muted)]"
              >
                Es gibt bereits ein Protokoll für {{ daypartLabel(initialDaypart) }}. Sie legen trotzdem einen neuen Eintrag an.
              </p>
            </div>

            <div
              v-if="mode === 'choice' && existingLog"
              class="space-y-4"
            >
              <div class="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                Für heute und {{ daypartLabel(initialDaypart) }} gibt es bereits ein Protokoll von
                <span class="font-semibold">{{ existingLog.employee_name }}</span>
                vom {{ formatDateTime(existingLog.created_at) }}.
              </div>

              <div class="grid gap-3">
                <button
                  type="button"
                  class="rounded-[1.35rem] border border-[var(--surface-line)] bg-white px-4 py-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
                  @click="setMode('edit')"
                >
                  <span class="block text-base font-semibold text-[var(--surface-ink)]">Altes Protokoll bearbeiten</span>
                  <span class="mt-1 block text-sm leading-6 text-[var(--surface-muted)]">
                    Den vorhandenen Eintrag öffnen und die Angaben anpassen.
                  </span>
                </button>

                <button
                  type="button"
                  class="rounded-[1.35rem] border border-[var(--surface-line)] bg-white px-4 py-4 text-left transition hover:border-teal-300 hover:shadow-sm"
                  @click="setMode('new')"
                >
                  <span class="block text-base font-semibold text-[var(--surface-ink)]">Trotzdem neues Protokoll erstellen</span>
                  <span class="mt-1 block text-sm leading-6 text-[var(--surface-muted)]">
                    Einen zusätzlichen Eintrag für denselben Tag und dieselbe Tageszeit erfassen.
                  </span>
                </button>
              </div>
            </div>

            <template v-else>
              <div
                v-if="existingLog"
                class="mb-4 flex justify-end"
              >
                <UButton
                  color="neutral"
                  variant="outline"
                  size="sm"
                  label="Auswahl anzeigen"
                  @click="setMode('choice')"
                />
              </div>

              <RoomLogForm
                :submitting="submitting"
                :reset-token="resetToken"
                :initial-daypart="initialDaypart"
                :initial-state="formInitialState"
                :show-cancel="true"
                :submit-label="formSubmitLabel"
                @cancel="modalOpen = false"
                @submit-log="submitLog"
              />
            </template>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
