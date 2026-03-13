<script setup lang="ts">
import { readableInputUi } from '~/utils/ui-presets'

const open = defineModel<boolean>('open', { required: true })
const password = defineModel<string>('password', { required: true })

const props = defineProps<{
  pending: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: []
}>()

const formElement = ref<HTMLFormElement | null>(null)
const localError = ref('')
const passwordInputId = useId()
const passwordErrorId = useId()

const visibleError = computed(() => localError.value || props.error)

watch(open, (value) => {
  if (!value) {
    localError.value = ''
  }
})

watch(() => props.error, (value) => {
  if (value) {
    localError.value = ''
  }
})

function submit() {
  if (!password.value.trim()) {
    localError.value = 'Bitte ein Passwort eingeben.'
    nextTick(() => {
      formElement.value?.querySelector<HTMLInputElement>(`#${passwordInputId}`)?.focus()
    })
    return
  }

  localError.value = ''
  emit('submit')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="!pending"
  >
    <template #header>
      <div class="flex w-full items-start justify-between gap-4">
        <div>
          <h2 class="section-title text-2xl">
            Admin-Anmeldung
          </h2>
          <p class="mt-1 text-sm text-[var(--surface-muted)]">
            Passwort eingeben, um den Admin-Modus zu öffnen.
          </p>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          aria-label="Modal schließen"
          :disabled="pending"
          @click="open = false"
        />
      </div>
    </template>

    <template #body>
      <form
        ref="formElement"
        class="space-y-4"
        novalidate
        @submit.prevent="submit"
      >
        <div
          v-if="visibleError"
          :id="passwordErrorId"
          class="rounded-2xl border border-red-300/80 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          aria-live="assertive"
        >
          {{ visibleError }}
        </div>

        <label class="field-block">
          <span class="field-label">Passwort</span>
          <UInput
            :id="passwordInputId"
            v-model="password"
            autocomplete="current-password"
            maxlength="128"
            type="password"
            placeholder="Passwort"
            required
            :aria-describedby="visibleError ? passwordErrorId : undefined"
            :aria-invalid="visibleError ? 'true' : 'false'"
            :ui="readableInputUi"
          />
        </label>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="outline"
          label="Abbrechen"
          :disabled="pending"
          @click="open = false"
        />
        <UButton
          color="primary"
          :loading="pending"
          label="Anmelden"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
