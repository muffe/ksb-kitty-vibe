<script setup lang="ts">
import type { Daypart, Room, RoomLogInsert } from '~/utils/cat-shelter'
import { daypartLabel, roomDisplayName } from '~/utils/cat-shelter'

const props = withDefaults(defineProps<{
  open: boolean
  room?: Room | null
  submitting: boolean
  initialDaypart: Daypart
  completed: boolean
}>(), {
  room: null
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit-log': [payload: RoomLogInsert]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const resetToken = ref(0)

watch(
  () => [props.open, props.room?.id, props.initialDaypart] as const,
  ([open]) => {
    if (open) {
      resetToken.value += 1
    }
  }
)
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    :title="room ? roomDisplayName(room) : 'Protokoll'"
    :description="`Protokoll für ${daypartLabel(initialDaypart)} erfassen.`"
    :dismissible="!submitting"
    :ui="{
      content: 'w-[calc(100vw-1.5rem)] max-w-[980px] rounded-[1.75rem] ring ring-default shadow-2xl',
      header: 'p-4 sm:px-6 lg:px-8 min-h-16',
      body: 'p-4 sm:p-6 lg:p-8',
      footer: 'hidden'
    }"
  >
    <template #body>
      <div
        v-if="room"
        class="space-y-6"
      >
        <div class="flex flex-wrap items-center gap-2">
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

        <p
          v-if="room.description"
          class="text-sm leading-6 text-[var(--surface-muted)]"
        >
          {{ room.description }}
        </p>

        <div
          v-if="room.warning_info"
          class="rounded-[1.5rem] border border-amber-300/80 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900"
        >
          <p class="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Warnung / Information
          </p>
          <p>{{ room.warning_info }}</p>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="feeding-box">
            <p class="section-kicker">
              Futterplan
            </p>
            <h3 class="section-title text-lg">
              Morgens
            </h3>

            <div class="mt-3 space-y-2 text-sm leading-6 text-[var(--surface-muted)]">
              <p><span class="font-semibold text-[var(--surface-ink)]">Trockenfutter:</span> {{ room.morning_dry_food || 'Keine Angabe' }}</p>
              <p><span class="font-semibold text-[var(--surface-ink)]">Nassfutter:</span> {{ room.morning_wet_food || 'Keine Angabe' }}</p>
              <p><span class="font-semibold text-[var(--surface-ink)]">Medizin:</span> {{ room.morning_medicine || 'Keine Angabe' }}</p>
            </div>
          </div>

          <div class="feeding-box">
            <p class="section-kicker">
              Futterplan
            </p>
            <h3 class="section-title text-lg">
              Abends
            </h3>

            <div class="mt-3 space-y-2 text-sm leading-6 text-[var(--surface-muted)]">
              <p><span class="font-semibold text-[var(--surface-ink)]">Trockenfutter:</span> {{ room.evening_dry_food || 'Keine Angabe' }}</p>
              <p><span class="font-semibold text-[var(--surface-ink)]">Nassfutter:</span> {{ room.evening_wet_food || 'Keine Angabe' }}</p>
              <p><span class="font-semibold text-[var(--surface-ink)]">Medizin:</span> {{ room.evening_medicine || 'Keine Angabe' }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-[1.75rem] border border-[var(--surface-line)] bg-white/90 p-5 shadow-sm">
          <div class="mb-4">
            <p class="section-kicker">
              Rundgang
            </p>
            <h3 class="section-title text-lg">
              Protokoll erfassen
            </h3>
          </div>

          <RoomLogForm
            :room-id="room.id"
            :submitting="submitting"
            :reset-token="resetToken"
            :initial-daypart="initialDaypart"
            @submit-log="emit('submit-log', $event)"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
