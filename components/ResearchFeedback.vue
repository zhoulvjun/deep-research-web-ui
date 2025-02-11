<script setup lang="ts">
  import { parsePartialJson } from '@ai-sdk/ui-utils'
  import { useChat } from '@ai-sdk/vue'
  import { isObject } from '@vueuse/core'

  export interface ResearchFeedbackResult {
    assistantQuestion: string
    userAnswer: string
  }

  defineEmits<{
    (e: 'submit'): void
  }>()

  const modelValue = defineModel<ResearchFeedbackResult[]>({
    default: () => [],
  })

  const { messages, input, error, handleSubmit, isLoading } = useChat({
    api: '/api/generate-feedback',
  })

  const isSubmitButtonDisabled = computed(
    () =>
      !modelValue.value.length ||
      // All questions should be answered
      modelValue.value.some((v) => !v.assistantQuestion || !v.userAnswer) ||
      // Should not be loading
      isLoading.value,
  )

  async function getFeedback(query: string, numQuestions = 3) {
    clear()
    // Set input value. (This only makes sure that the library sends the request)
    input.value = query
    handleSubmit(
      {},
      {
        body: {
          query,
          numQuestions,
        },
      },
    )
  }
  function clear() {
    messages.value = []
    input.value = ''
    error.value = undefined
    modelValue.value = []
  }

  watch(messages, (m) => {
    const assistantMessage = m[m.length - 1]
    if (assistantMessage?.role !== 'assistant') {
      return {
        value: undefined,
        state: 'undefined-input',
      }
    }

    const content = removeJsonMarkdown(assistantMessage.content)
    // Write the questions into modelValue
    const parseResult = parsePartialJson(content)

    console.log(parseResult)
    if (parseResult.state === 'repaired-parse' || parseResult.state === 'successful-parse') {
      if (!isObject(parseResult.value) || Array.isArray(parseResult.value)) {
        return (modelValue.value = [])
      }
      const unsafeQuestions = parseResult.value.questions
      if (!unsafeQuestions || !Array.isArray(unsafeQuestions)) return (modelValue.value = [])

      const questions = unsafeQuestions.filter((s) => typeof s === 'string')
      // Incrementally update modelValue
      for (let i = 0; i < questions.length; i += 1) {
        if (modelValue.value[i]) {
          modelValue.value[i].assistantQuestion = questions[i]
        } else {
          modelValue.value.push({
            assistantQuestion: questions[i],
            userAnswer: '',
          })
        }
      }
    } else {
      modelValue.value = []
    }
  })

  watch(error, (e) => {
    if (e) {
      console.error(`ResearchFeedback error,`, e)
    }
  })

  defineExpose({
    getFeedback,
    clear,
  })
</script>

<template>
  <UCard>
    <div class="flex flex-col gap-2">
      <div v-if="!modelValue.length && !error">Waiting for model feedback...</div>
      <template v-else>
        <div v-if="error" class="text-red-500">{{ error }}</div>
        <div v-for="(feedback, index) in modelValue" class="flex flex-col gap-2" :key="index">
          Assistant: {{ feedback.assistantQuestion }}
          <UInput v-model="feedback.userAnswer" />
        </div>
      </template>
      <UButton color="primary" :loading="isLoading" :disabled="isSubmitButtonDisabled" block @click="$emit('submit')">
        Submit Answer
      </UButton>
    </div>
  </UCard>
</template>
