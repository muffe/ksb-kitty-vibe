<script setup lang="ts">
import type { Daypart, RoomLogFormState } from '~/utils/cat-shelter'
import {
  createRoomLogFormState,
  daypartOptions,
  stoolFields
} from '~/utils/cat-shelter'
import {
  readableCheckboxCardUi,
  readableInputUi,
  readableSelectUi,
  readableTextareaUi
} from '~/utils/ui-presets'

const props = withDefaults(defineProps<{
  submitting: boolean
  resetToken: number
  initialDaypart?: Daypart
  initialState?: Partial<RoomLogFormState> | null
  showCancel?: boolean
  submitLabel?: string
}>(), {
  initialDaypart: 'morning',
  initialState: null,
  showCancel: false,
  submitLabel: 'Protokoll speichern'
})

const emit = defineEmits<{
  'cancel': []
  'submit-log': [state: RoomLogFormState]
}>()

const formElement = ref<HTMLFormElement | null>(null)
const state = reactive(createRoomLogFormState(props.initialDaypart))
const localError = ref('')
const employeeInputId = useId()
const employeeErrorId = useId()

function createInitialState() {
  return {
    ...createRoomLogFormState(props.initialDaypart),
    ...(props.initialState ?? {})
  } satisfies RoomLogFormState
}

watch(
  () => [props.resetToken, props.initialDaypart, props.initialState],
  () => {
    Object.assign(state, createInitialState())
    localError.value = ''
  },
  { immediate: true }
)

function submit() {
  if (!state.employee_name.trim()) {
    localError.value = 'Bitte den Namen der mitarbeitenden Person eintragen.'
    nextTick(() => {
      formElement.value?.querySelector<HTMLInputElement>(`#${employeeInputId}`)?.focus()
    })
    return
  }

  localError.value = ''
  emit('submit-log', { ...state } as RoomLogFormState)
}
</script>

<template>
  <form
    ref="formElement"
    novalidate
    @submit.prevent="submit"
  >
    <div
      v-if="localError"
      :id="employeeErrorId"
      class="mb-4 rounded-2xl border border-red-300/80 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
      aria-live="assertive"
    >
      {{ localError }}
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
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
          :id="employeeInputId"
          v-model="state.employee_name"
          autocomplete="name"
          maxlength="80"
          placeholder="Name eintragen"
          required
          :aria-describedby="localError ? employeeErrorId : undefined"
          :aria-invalid="localError ? 'true' : 'false'"
          :ui="readableInputUi"
        />
      </label>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
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
      class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
        maxlength="600"
        placeholder="Auffälligkeiten, Medikamente, Rückfragen oder Besonderheiten"
        :ui="readableTextareaUi"
      />
    </label>

    <div class="mt-5 flex flex-wrap justify-end gap-3">
      <UButton
        v-if="showCancel"
        color="neutral"
        variant="outline"
        label="Abbrechen"
        :disabled="submitting"
        @click="emit('cancel')"
      />
      <UButton
        color="primary"
        icon="i-lucide-check-check"
        :loading="submitting"
        :label="submitLabel"
        type="submit"
      />
    </div>
  </form>
</template>
