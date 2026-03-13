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
const mode = ref<'edit' | 'new'>('new')

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

const formSubmitLabel = computed(() => mode.value === 'edit' ? 'Änderungen speichern' : 'Zusätzlichen Eintrag speichern')
const formHeading = computed(() => (
  props.existingLog && mode.value === 'edit'
    ? 'Vorhandenen Eintrag bearbeiten'
    : 'Neuen Eintrag hinzufügen'
))
const formDescription = computed(() => (
  props.existingLog && mode.value === 'edit'
    ? 'Passe den vorhandenen Protokolleintrag für diese Tageszeit an.'
    : 'Nur nutzen, wenn du ausnahmsweise einen zweiten Eintrag für diese Tageszeit brauchst.'
))
const existingLogMeta = computed(() => {
  if (!props.existingLog) {
    return ''
  }

  const employeeName = props.existingLog.employee_name?.trim() || 'Ohne Namen'
  return `${employeeName} · ${formatDateTime(props.existingLog.created_at)}`
})

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
      mode.value = props.existingLog ? 'edit' : 'new'
      resetToken.value += 1
    }
  }
)

function setMode(nextMode: 'edit' | 'new') {
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
      content: 'w-[calc(100vw-1rem)] max-h-[calc(100svh-1rem)] overflow-hidden rounded-[1.5rem] ring ring-default shadow-2xl sm:max-h-[min(100svh-2rem,56rem)] sm:max-w-[1040px] sm:rounded-[1.75rem]',
      header: 'p-3 sm:px-6 sm:py-4 lg:px-8',
      body: 'overflow-y-auto p-3 sm:p-6 lg:p-8',
      footer: 'hidden'
    }"
  >
    <template #header>
      <div
        v-if="room"
        class="flex w-full items-start justify-between gap-4"
      >
        <div class="min-w-0 flex-1">
          <div class="space-y-2 text-left">
            <h2 class="section-title break-words text-2xl">
              {{ roomDisplayName(room) }}
            </h2>

            <div
              v-if="room.warning_info"
              class="panel-shell panel-shell--muted flex max-w-full items-start gap-2 rounded-[1rem] px-3 py-2"
            >
              <UIcon
                name="i-lucide-triangle-alert"
                class="mt-0.5 shrink-0 text-sm text-[var(--surface-muted)]"
              />
              <span class="min-w-0 break-words text-sm font-semibold leading-5 text-[var(--surface-ink)]">
                {{ room.warning_info }}
              </span>
            </div>
          </div>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          class="shrink-0 self-start"
          aria-label="Modal schließen"
          :disabled="submitting"
          @click="modalOpen = false"
        />
      </div>
    </template>

    <template #body>
      <div
        v-if="room"
        class="grid gap-5 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] md:items-start"
      >
        <div class="space-y-5">
          <div class="panel-shell panel-shell--soft panel-block">
            <div class="flex flex-col gap-4">
              <div class="space-y-2">
                <p class="section-kicker">
                  Aktueller Plan
                </p>
                <h3 class="section-title break-words text-xl">
                  Futterplan {{ feedingPlans.current.label }}
                </h3>
              </div>

              <div class="flex flex-wrap items-start gap-2 sm:items-center">
                <UBadge
                  color="primary"
                  variant="soft"
                  :label="`Reihenfolge ${room.sort_order}`"
                />
                <UBadge
                  :color="completed ? 'success' : 'warning'"
                  variant="subtle"
                  :label="completed ? `${daypartLabel(initialDaypart)} erledigt` : `${daypartLabel(initialDaypart)} offen`"
                />
              </div>
            </div>

            <dl class="mt-4 space-y-3">
              <div
                v-for="entry in feedingPlans.current.entries"
                :key="entry.label"
                class="info-list-card"
              >
                <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--surface-muted)]">
                  {{ entry.label }}
                </dt>
                <dd class="mt-1 break-words text-sm leading-6 text-[var(--surface-ink)]">
                  {{ entry.value }}
                </dd>
              </div>
            </dl>
          </div>

          <details
            v-if="hasSecondaryInfo"
            :key="resetToken"
            class="panel-shell panel-shell--muted rounded-[1.2rem]"
          >
            <summary class="cursor-pointer list-none rounded-[1.2rem] px-4 py-3 text-sm font-semibold text-[var(--surface-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(21,167,159,0.52)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)]">
              <span class="flex items-center justify-between gap-3">
                <span>Mehr zum Raum</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="shrink-0 text-base text-[var(--surface-muted)]"
                />
              </span>
            </summary>

            <div class="space-y-4 border-t border-[var(--surface-line)] px-4 py-4">
              <div v-if="room.description">
                <p class="section-kicker">
                  Hinweis
                </p>
                <p class="mt-2 break-words text-sm leading-6 text-[var(--surface-muted)]">
                  {{ room.description }}
                </p>
              </div>

              <div>
                <p class="section-kicker">
                  Anderer Plan
                </p>
                <h3 class="section-title mt-1 text-lg">
                  {{ feedingPlans.alternate.label }}
                </h3>

                <dl class="mt-3 space-y-3">
                  <div
                    v-for="entry in feedingPlans.alternate.entries"
                    :key="entry.label"
                    class="info-list-card grid gap-1 text-sm leading-6"
                  >
                    <dt class="font-semibold text-[var(--surface-ink)]">
                      {{ entry.label }}
                    </dt>
                    <dd class="break-words text-[var(--surface-muted)]">
                      {{ entry.value }}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </details>
        </div>

        <div class="panel-shell panel-shell--solid panel-block-lg min-w-0 lg:p-6">
          <div class="mb-5 flex flex-col gap-3 border-b border-[var(--surface-line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-2">
              <p class="section-kicker">
                Protokoll
              </p>
              <h3 class="section-title break-words text-xl">
                {{ formHeading }}
              </h3>
              <p
                v-if="formDescription"
                class="break-words text-sm leading-6 text-[var(--surface-muted)]"
              >
                {{ formDescription }}
              </p>
              <p
                v-if="existingLogMeta && mode === 'edit'"
                class="break-words text-sm leading-6 text-[var(--surface-muted)]"
              >
                {{ existingLogMeta }}
              </p>
            </div>

            <div
              v-if="existingLog"
              class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end"
            >
              <UButton
                v-if="mode === 'new'"
                color="neutral"
                variant="outline"
                size="sm"
                class="w-full justify-center sm:w-auto"
                label="Vorhandenen Eintrag öffnen"
                :ui="{
                  base: 'focus-visible:ring-2 focus-visible:ring-[rgba(21,167,159,0.52)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)]'
                }"
                @click="setMode('edit')"
              />
              <UButton
                v-else
                color="neutral"
                variant="ghost"
                size="sm"
                class="w-full justify-center sm:w-auto"
                label="Zusätzlichen Eintrag anlegen"
                :ui="{
                  base: 'focus-visible:ring-2 focus-visible:ring-[rgba(21,167,159,0.52)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-bg)]'
                }"
                @click="setMode('new')"
              />
            </div>
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
        </div>
      </div>
    </template>
  </UModal>
</template>
