<script setup lang="ts">
  interface OpenAICompatibleModel {
    id: string
    object: string
  }
  interface OpenAICompatibleModelsResponse {
    object: string
    data: OpenAICompatibleModel[]
  }

  const { config, aiApiBase } = storeToRefs(useConfigStore())
  const { t } = useI18n()

  const showModal = ref(false)
  const loadingAiModels = ref(false)
  const aiModelOptions = ref<string[]>([])
  /** If loading AI models failed, use a plain input to improve UX */
  const isLoadAiModelsFailed = ref(false)

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
    aiProviderOptions.value.find((o) => o.value === config.value.ai.provider),
  )

  // Try to find available AI models based on selected provider
  const debouncedListAiModels = useDebounceFn(async () => {
    if (!config.value.ai.apiKey) return
    if (!aiApiBase.value || !aiApiBase.value.startsWith('http')) return

    try {
      loadingAiModels.value = true
      const result: OpenAICompatibleModelsResponse = await $fetch(
        `${aiApiBase.value}/models`,
        {
          headers: {
            Authorization: `Bearer ${config.value.ai.apiKey}`,
          },
        },
      )
      console.log(
        `Found ${result.data.length} AI models for provider ${config.value.ai.provider}`,
      )
      aiModelOptions.value = result.data.map((m) => m.id)
      isLoadAiModelsFailed.value = false

      if (aiModelOptions.value.length) {
        // Auto-select the current model
        if (
          config.value.ai.model &&
          !aiModelOptions.value.includes(config.value.ai.model)
        ) {
          aiModelOptions.value.unshift(config.value.ai.model)
        }
      }
    } catch (error) {
      console.error(`Fetch AI models failed`, error)
      isLoadAiModelsFailed.value = true
      aiModelOptions.value = []
    } finally {
      loadingAiModels.value = false
    }
  }, 1000)

  function createAndSelectAiModel(model: string) {
    aiModelOptions.value.push(model)
    config.value.ai.model = model
  }

  watch(
    () => [
      config.value.ai.provider,
      config.value.ai.apiKey,
      config.value.ai.apiBase,
      showModal.value,
    ],
    () => {
      if (!showModal.value) return
      debouncedListAiModels()
    },
    { immediate: true },
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
            class="flex flex-col gap-y-2"
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
            <UFormField :label="$t('settings.ai.model')" required>
              <UInputMenu
                v-if="aiModelOptions.length && !isLoadAiModelsFailed"
                v-model="config.ai.model"
                class="w-full"
                :items="aiModelOptions"
                :placeholder="$t('settings.ai.model')"
                :loading="loadingAiModels"
                create-item
                @create="createAndSelectAiModel"
              />
              <UInput
                v-else
                v-model="config.ai.model"
                class="w-full"
                :placeholder="$t('settings.ai.model')"
              />
            </UFormField>
          </div>

          <USeparator class="my-2" />

          <!-- Web search -->
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
          <UFormField :label="$t('settings.webSearch.queryLanguage')">
            <template #help>
              <i18n-t
                class="whitespace-pre-wrap"
                keypath="settings.webSearch.queryLanguageHelp"
                tag="p"
              />
            </template>
            <LangSwitcher
              :value="config.webSearch.searchLanguage"
              @update="config.webSearch.searchLanguage = $event"
              private
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
