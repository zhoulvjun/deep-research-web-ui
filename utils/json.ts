import { parsePartialJson } from '@ai-sdk/ui-utils'
import { z } from 'zod'

export type DeepPartial<T> = T extends object
  ? T extends Array<any>
    ? T
    : { [P in keyof T]?: DeepPartial<T[P]> }
  : T

export function removeJsonMarkdown(text: string) {
  text = text.trim()
  if (text.startsWith('```json')) {
    text = text.slice(7)
  } else if (text.startsWith('json')) {
    text = text.slice(4)
  } else if (text.startsWith('```')) {
    text = text.slice(3)
  }
  if (text.endsWith('```')) {
    text = text.slice(0, -3)
  }
  return text.trim()
}

/**
 * 解析流式的 JSON 数据
 * @param textStream 字符串流
 * @param _schema zod schema 用于类型验证
 * @param isValid 自定义验证函数，用于判断解析出的 JSON 是否有效
 * @returns 异步生成器，yield 解析后的数据
 */
export async function* parseStreamingJson<T extends z.ZodType>(
  textStream: AsyncIterable<string>,
  _schema: T,
  isValid: (value: DeepPartial<z.infer<T>>) => boolean,
): AsyncGenerator<DeepPartial<z.infer<T>>> {
  let rawText = ''
  let isParseSuccessful = false

  for await (const chunk of textStream) {
    rawText += chunk
    const parsed = parsePartialJson(removeJsonMarkdown(rawText))

    isParseSuccessful =
      parsed.state === 'repaired-parse' || parsed.state === 'successful-parse'
    if (isParseSuccessful && isValid(parsed.value as any)) {
      yield parsed.value as DeepPartial<z.infer<T>>
    } else {
      console.debug(`Failed to parse JSON:`, rawText)
    }
  }

  return { isSuccessful: isParseSuccessful }
}
