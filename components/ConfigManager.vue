<script setup lang="ts">
  const { config } = useConfigStore()
  const showModal = ref(false)

  defineExpose({
    show() {
      showModal.value = true
    },
  })
</script>

<template>
  <div>
    <UModal v-model:open="showModal" title="Settings">
      <UButton icon="i-lucide-settings" />

      <template #body>
        <div class="space-y-2">
          <!-- AI provider -->
          <h3 class="font-bold">AI Provider</h3>
          <UFormField label="Provider">
            <template #help>
              Currently only OpenAI compatible providers are supported, e.g.
              Gemini, Together AI, SiliconCloud, ...
            </template>
            <USelect
              v-model="config.ai.provider"
              :items="[
                { label: 'OpenAI Compatible', value: 'openai-compatible' },
              ]"
            />
          </UFormField>
          <div
            v-if="config.ai.provider === 'openai-compatible'"
            class="space-y-2"
          >
            <UFormField label="API Key" required>
              <PasswordInput
                v-model="config.ai.apiKey"
                class="w-full"
                placeholder="API Key"
              />
            </UFormField>
            <UFormField label="API Base URL">
              <UInput
                v-model="config.ai.apiBase"
                class="w-full"
                placeholder="https://api.openai.com/v1"
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

          <USeparator class="my-4" />

          <!-- Web search provider -->
          <h3 class="font-bold">Web Search Provider</h3>
          <UFormField label="Provider">
            <template #help>
              Tavily is similar to Firecrawl, but with more free quota (1000
              credits / month). Get one API key at
              <UButton
                class="!p-0"
                to="https://app.tavily.com/home"
                target="_blank"
                variant="link"
              >
                app.tavily.com
              </UButton>
              .
            </template>
            <USelect
              v-model="config.webSearch.provider"
              :items="[{ label: 'Tavily', value: 'tavily' }]"
            />
          </UFormField>
          <UFormField label="API Key" required>
            <PasswordInput
              v-model="config.webSearch.apiKey"
              class="w-full"
              placeholder="API Key"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-between gap-2 w-full">
          <p class="text-sm text-gray-500">
            Settings are stored locally in your browser.
          </p>
          <UButton
            color="primary"
            icon="i-lucide-check"
            @click="showModal = false"
          >
            Save
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
