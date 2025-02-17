import { skipHydrate } from 'pinia'
import type { Locale } from '~/components/LangSwitcher.vue'

export type ConfigAiProvider =
  | 'openai-compatible'
  | 'openrouter'
  | 'deepseek'
  | 'ollama'

export type ConfigWebSearchProvider = 'tavily' | 'firecrawl'

export interface ConfigAi {
  provider: ConfigAiProvider
  apiKey?: string
  apiBase?: string
  model: string
  contextSize?: number
}
export interface ConfigWebSearch {
  provider: ConfigWebSearchProvider
  apiKey?: string
  /** Force the LLM to generate serp queries in a certain language */
  searchLanguage?: Locale
  /** Limit the number of concurrent tasks globally */
  concurrencyLimit?: number
}

export interface Config {
  ai: ConfigAi
  webSearch: ConfigWebSearch
}

function validateConfig(config: Config) {
  const ai = config.ai
  if (ai.provider !== 'ollama' && !ai.apiKey) return false
  if (typeof ai.contextSize !== 'undefined' && ai.contextSize < 0) return false

  const ws = config.webSearch
  if (!ws.apiKey) return false
  if (typeof ws.concurrencyLimit !== 'undefined' && ws.concurrencyLimit! < 1)
    return false
  return true
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
      concurrencyLimit: 2,
    },
  } satisfies Config)
  // The version user dismissed the update notification
  const dismissUpdateVersion = useLocalStorage<string>(
    'dismiss-update-version',
    '',
  )
  const isConfigValid = computed(() => validateConfig(config.value))

  const aiApiBase = computed(() => {
    if (config.value.ai.provider === 'openrouter') {
      return config.value.ai.apiBase || 'https://openrouter.ai/api/v1'
    }
    if (config.value.ai.provider === 'deepseek') {
      return config.value.ai.apiBase || 'https://api.deepseek.com/v1'
    }
    if (config.value.ai.provider === 'ollama') {
      return config.value.ai.apiBase || 'http://localhost:11434/v1'
    }
    return config.value.ai.apiBase || 'https://api.openai.com/v1'
  })

  const showConfigManager = ref(false)

  return {
    config: skipHydrate(config),
    isConfigValid,
    aiApiBase,
    showConfigManager,
    dismissUpdateVersion: skipHydrate(dismissUpdateVersion),
  }
})
