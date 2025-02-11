import {} from '@pinia/nuxt'

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

  return { config }
})
