<script setup lang="ts">
  interface OpenAICompatibleModel {
    id: string
    object: string
  }
  interface OpenAICompatibleModelsResponse {
    object: string
    data: OpenAICompatibleModel[]
  }

  const {
    config,
    aiApiBase,
    showConfigManager: showModal,
  } = storeToRefs(useConfigStore())
  const { t } = useI18n()

  const loadingAiModels = ref(false)
  const aiModelOptions = ref<string[]>([])
  /** If loading AI models failed, use a plain input to improve UX */
  const isLoadAiModelsFailed = ref(false)

  const aiProviderOptions = computed(() => [
    {
      label: t('settings.ai.providers.openaiCompatible.title'),
      help: t('settings.ai.providers.openaiCompatible.description'),
      value: 'openai-compatible',
    },
    {
      label: 'DeepSeek',
      value: 'deepseek',
    },
    {
      label: 'OpenRouter',
      value: 'openrouter',
    },
    {
      label: 'Ollama',
      value: 'ollama',
    },
  ])
  const webSearchProviderOptions = computed(() => [
    {
      label: 'Tavily',
      value: 'tavily',
      help: 'settings.webSearch.providers.tavily.help',
      // Only kept for easy reference in i18n Ally
      _help: t('settings.webSearch.providers.tavily.help'),
      link: 'https://app.tavily.com/home',
    },
    {
      label: 'Firecrawl',
      value: 'firecrawl',
      help: 'settings.webSearch.providers.firecrawl.help',
      // Only kept for easy reference in i18n Ally
      _help: t('settings.webSearch.providers.firecrawl.help'),
      link: 'https://www.firecrawl.dev/app/api-keys',
    },
  ])
  const selectedAiProvider = computed(() =>
    aiProviderOptions.value.find((o) => o.value === config.value.ai.provider),
  )
  const selectedWebSearchProvider = computed(() =>
    webSearchProviderOptions.value.find(
      (o) => o.value === config.value.webSearch.provider,
    ),
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
  }, 500)

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
              <span class="whitespace-pre-wrap">
                {{ selectedAiProvider.help }}
              </span>
            </template>
            <USelect
              v-model="config.ai.provider"
              class="w-auto"
              :items="aiProviderOptions"
            />
          </UFormField>

          <div class="flex flex-col gap-y-2">
            <UFormField
              :label="$t('settings.ai.apiKey')"
              :required="config.ai.provider !== 'ollama'"
            >
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
                :placeholder="aiApiBase"
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
            <UFormField :label="$t('settings.ai.contextSize')">
              <template #help>
                {{ $t('settings.ai.contextSizeHelp') }}
              </template>
              <UInput
                v-model="config.ai.contextSize"
                class="w-26"
                type="number"
                placeholder="128000"
                :min="512"
              />
              tokens
            </UFormField>
          </div>

          <USeparator class="my-2" />

          <!-- Web search -->
          <h3 class="font-bold"> {{ $t('settings.webSearch.provider') }} </h3>
          <UFormField>
            <template #help>
              <i18n-t
                v-if="selectedWebSearchProvider?.help"
                :keypath="selectedWebSearchProvider.help"
                tag="p"
              >
                <UButton
                  class="!p-0"
                  :to="selectedWebSearchProvider.link"
                  target="_blank"
                  variant="link"
                >
                  {{ selectedWebSearchProvider.link }}
                </UButton>
              </i18n-t>
            </template>
            <USelect
              v-model="config.webSearch.provider"
              class="w-auto"
              :items="webSearchProviderOptions"
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
          <UFormField :label="$t('settings.webSearch.concurrencyLimit')">
            <template #help>
              {{ $t('settings.webSearch.concurrencyLimitHelp') }}
            </template>
            <UInput
              v-model="config.webSearch.concurrencyLimit"
              class="w-15"
              type="number"
              placeholder="2"
              :min="1"
              :max="5"
              :step="1"
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
