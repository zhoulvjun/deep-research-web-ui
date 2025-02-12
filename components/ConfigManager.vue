<script setup lang="ts">
  const { config } = useConfigStore()
  const { t } = useI18n()

  const showModal = ref(false)

  const aiProviderOptions = computed(() => [
    {
      label: t('settings.ai.providers.openaiCompatible.title'),
      help: t('settings.ai.providers.openaiCompatible.description'),
      apiBasePlaceholder: t(
        'settings.ai.providers.openaiCompatible.apiBasePlaceholder',
      ),
      value: 'openai-compatible',
    },
  ])
  const selectedAiProvider = computed(() =>
    aiProviderOptions.value.find((o) => o.value === config.ai.provider),
  )

  defineExpose({
    show() {
      showModal.value = true
    },
  })
</script>

<template>
  <div>
    <UModal v-model:open="showModal" :title="$t('settings.title')">
      <UButton icon="i-lucide-settings" />

      <template #body>
        <div class="flex flex-col gap-y-2">
          <!-- AI provider -->
          <h3 class="font-bold">{{ $t('settings.ai.provider') }}</h3>
          <UFormField>
            <template v-if="selectedAiProvider" #help>
              {{ selectedAiProvider.help }}
            </template>
            <USelect v-model="config.ai.provider" :items="aiProviderOptions" />
          </UFormField>
          <div
            v-if="config.ai.provider === 'openai-compatible'"
            class="space-y-2"
          >
            <UFormField :label="$t('settings.ai.apiKey')" required>
              <PasswordInput
                v-model="config.ai.apiKey"
                class="w-full"
                :placeholder="$t('settings.ai.apiKey')"
              />
            </UFormField>
            <UFormField :label="$t('settings.ai.apiBase')">
              <UInput
                v-model="config.ai.apiBase"
                class="w-full"
                :placeholder="selectedAiProvider?.apiBasePlaceholder"
              />
            </UFormField>
            <UFormField label="Model" required>
              <UInput
                v-model="config.ai.model"
                class="w-full"
                placeholder="Model name"
              />
            </UFormField>
          </div>

          <USeparator class="my-2" />

          <!-- Web search provider -->
          <h3 class="font-bold"> {{ $t('settings.webSearch.provider') }} </h3>
          <UFormField>
            <template #help>
              <i18n-t keypath="settings.webSearch.providerHelp" tag="p">
                <UButton
                  class="!p-0"
                  to="https://app.tavily.com/home"
                  target="_blank"
                  variant="link"
                >
                  app.tavily.com
                </UButton>
              </i18n-t>
            </template>
            <USelect
              v-model="config.webSearch.provider"
              :items="[{ label: 'Tavily', value: 'tavily' }]"
            />
          </UFormField>
          <UFormField :label="$t('settings.webSearch.apiKey')" required>
            <PasswordInput
              v-model="config.webSearch.apiKey"
              class="w-full"
              :placeholder="$t('settings.webSearch.apiKey')"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-between gap-2 w-full">
          <p class="text-sm text-gray-500">
            {{ $t('settings.disclaimer') }}
          </p>
          <UButton
            color="primary"
            icon="i-lucide-check"
            @click="showModal = false"
          >
            {{ $t('settings.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
