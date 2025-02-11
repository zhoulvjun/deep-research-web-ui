import { tavily } from '@tavily/core'

export const useTavily = () => {
  const config = useConfigStore()
  const tvly = tavily({
    apiKey: config.config.webSearch.apiKey,
  })
  return tvly
}
