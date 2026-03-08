<script setup lang="ts">
import { readableInputUi } from '~/utils/ui-presets'

const open = defineModel<boolean>('open', { required: true })
const password = defineModel<string>('password', { required: true })

defineProps<{
  pending: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: []
}>()
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
      <div class="space-y-4">
        <div
          v-if="error"
          class="rounded-2xl border border-red-300/80 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ error }}
        </div>

        <label class="field-block">
          <span class="field-label">Passwort</span>
          <UInput
            v-model="password"
            type="password"
            placeholder="Passwort"
            :ui="readableInputUi"
            @keydown.enter="emit('submit')"
          />
        </label>
      </div>
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
          @click="emit('submit')"
        />
      </div>
    </template>
  </UModal>
</template>
