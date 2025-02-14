import { createDeepSeek } from '@ai-sdk/deepseek'
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai'

export const useAiModel = () => {
  const config = useConfigStore()
  switch (config.config.ai.provider) {
    case 'openai-compatible':
      const deepseek = createDeepSeek({
        apiKey: config.config.ai.apiKey,
        baseURL: config.aiApiBase,
      })
      return wrapLanguageModel({
        model: deepseek(config.config.ai.model),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      })
    default:
      throw new Error(`Unknown AI provider: ${config.config.ai.provider}`)
  }
}
