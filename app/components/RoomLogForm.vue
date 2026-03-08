<script setup lang="ts">
import type { Daypart, RoomLogFormState } from '~/utils/cat-shelter'
import {
  createRoomLogFormState,
  daypartOptions,
  sanitizeRoomLogPayload,
  stoolFields
} from '~/utils/cat-shelter'
import {
  readableCheckboxCardUi,
  readableInputUi,
  readableSelectUi,
  readableTextareaUi
} from '~/utils/ui-presets'

const props = withDefaults(defineProps<{
  roomId: string
  submitting: boolean
  resetToken: number
  initialDaypart?: Daypart
  submitLabel?: string
}>(), {
  initialDaypart: 'morning',
  submitLabel: 'Protokoll speichern'
})

const emit = defineEmits<{
  'submit-log': [payload: ReturnType<typeof sanitizeRoomLogPayload>]
}>()

const state = reactive(createRoomLogFormState(props.initialDaypart))
const localError = ref('')

watch(
  () => [props.resetToken, props.initialDaypart],
  () => {
    Object.assign(state, createRoomLogFormState(props.initialDaypart))
    localError.value = ''
  },
  { immediate: true }
)

function submit() {
  if (!state.employee_name.trim()) {
    localError.value = 'Bitte den Namen der mitarbeitenden Person eintragen.'
    return
  }

  localError.value = ''
  emit('submit-log', sanitizeRoomLogPayload(props.roomId, { ...state } as RoomLogFormState))
}
</script>

<template>
  <div>
    <div
      v-if="localError"
      class="mb-4 rounded-2xl border border-red-300/80 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ localError }}
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <label class="field-block">
        <span class="field-label">Tageszeit</span>
        <USelect
          v-model="state.daypart"
          :items="daypartOptions"
          value-key="value"
          placeholder="Bitte wählen"
          :ui="readableSelectUi"
        />
      </label>

      <label class="field-block">
        <span class="field-label">Mitarbeiter</span>
        <UInput
          v-model="state.employee_name"
          placeholder="Name eintragen"
          :ui="readableInputUi"
        />
      </label>
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <UCheckbox
        v-model="state.ate_all_food"
        variant="card"
        label="Futter vollständig gefressen"
        :ui="readableCheckboxCardUi"
      />

      <UCheckbox
        v-model="state.no_stool_found"
        variant="card"
        label="Kein Kot gefunden"
        :ui="readableCheckboxCardUi"
      />
    </div>

    <div
      v-if="!state.no_stool_found"
      class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <label
        v-for="field in stoolFields"
        :key="field.key"
        class="field-block"
      >
        <span class="field-label">{{ field.label }}</span>
        <UInput
          v-model.number="state[field.key]"
          type="number"
          min="0"
          :ui="readableInputUi"
        />
      </label>
    </div>

    <label class="field-block mt-5">
      <span class="field-label">Kommentar</span>
      <UTextarea
        v-model="state.comment"
        :rows="3"
        placeholder="Auffälligkeiten, Medikamente, Rückfragen oder Besonderheiten"
        :ui="readableTextareaUi"
      />
    </label>

    <div class="mt-5 flex flex-wrap justify-end gap-3">
      <UButton
        color="neutral"
        variant="outline"
        label="Formular leeren"
        :disabled="submitting"
        @click="Object.assign(state, createRoomLogFormState(props.initialDaypart))"
      />
      <UButton
        color="primary"
        icon="i-lucide-check-check"
        :loading="submitting"
        :label="submitLabel"
        @click="submit"
      />
    </div>
  </div>
</template>
