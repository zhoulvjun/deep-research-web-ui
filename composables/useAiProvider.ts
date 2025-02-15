import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOpenAI } from '@ai-sdk/openai'
import {
  extractReasoningMiddleware,
  wrapLanguageModel,
  type LanguageModelV1,
} from 'ai'

export const useAiModel = () => {
  const config = useConfigStore()
  let model: LanguageModelV1

  switch (config.config.ai.provider) {
    case 'openrouter': {
      const openRouter = createOpenRouter({
        apiKey: config.config.ai.apiKey,
        baseURL: config.aiApiBase,
      })
      model = openRouter(config.config.ai.model, {
        includeReasoning: true,
      })
    }
    case 'deepseek': {
      const deepSeek = createDeepSeek({
        apiKey: config.config.ai.apiKey,
        baseURL: config.aiApiBase,
      })
      model = deepSeek(config.config.ai.model)
    }
    case 'openai-compatible':
    default: {
      const openai = createOpenAI({
        apiKey: config.config.ai.apiKey,
        baseURL: config.aiApiBase,
      })
      model = openai(config.config.ai.model)
    }
  }

  return wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  })
}
