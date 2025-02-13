import { skipHydrate } from 'pinia'
import type { Locale } from '~/components/LangSwitcher.vue'

export type ConfigAiProvider = 'openai-compatible'
export interface ConfigAi {
  provider: ConfigAiProvider
  apiKey?: string
  apiBase?: string
  model: string
  contextSize?: number
}
export interface ConfigWebSearch {
  provider: 'tavily'
  apiKey?: string
  /** Force the LLM to generate serp queries in a certain language */
  searchLanguage?: Locale
}

export interface Config {
  ai: ConfigAi
  webSearch: ConfigWebSearch
}

export const useConfigStore = defineStore('config', () => {
  const config = useLocalStorage<Config>('deep-research-config', {
    ai: {
      provider: 'openai-compatible',
      model: '',
      contextSize: 128_000,
    },
    webSearch: {
      provider: 'tavily',
    },
  })

  const aiApiBase = computed(() => {
    return config.value.ai.apiBase || 'https://api.openai.com/v1'
  })

  return { config: skipHydrate(config), aiApiBase }
})
