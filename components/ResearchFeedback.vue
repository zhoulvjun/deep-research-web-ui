<script setup lang="ts">
  import { parsePartialJson } from '@ai-sdk/ui-utils'
  import { useChat } from '@ai-sdk/vue'
  import { isObject } from '@vueuse/core'

  export interface ResearchFeedbackResult {
    assistantQuestion: string
    userAnswer: string
  }

  const props = defineProps<{
    isLoadingSearch?: boolean
  }>()

  defineEmits<{
    (e: 'submit', feedback: ResearchFeedbackResult[]): void
  }>()

  const feedback = ref<ResearchFeedbackResult[]>([])

  const { messages, input, error, handleSubmit, isLoading } = useChat({
    api: '/api/generate-feedback',
  })

  const isSubmitButtonDisabled = computed(
    () =>
      !feedback.value.length ||
      // All questions should be answered
      feedback.value.some((v) => !v.assistantQuestion || !v.userAnswer) ||
      // Should not be loading
      isLoading.value ||
      props.isLoadingSearch,
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
    feedback.value = []
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

    if (parseResult.state === 'repaired-parse' || parseResult.state === 'successful-parse') {
      if (!isObject(parseResult.value) || Array.isArray(parseResult.value)) {
        return (feedback.value = [])
      }
      const unsafeQuestions = parseResult.value.questions
      if (!unsafeQuestions || !Array.isArray(unsafeQuestions)) return (feedback.value = [])

      const questions = unsafeQuestions.filter((s) => typeof s === 'string')
      // Incrementally update modelValue
      for (let i = 0; i < questions.length; i += 1) {
        if (feedback.value[i]) {
          feedback.value[i].assistantQuestion = questions[i]
        } else {
          feedback.value.push({
            assistantQuestion: questions[i],
            userAnswer: '',
          })
        }
      }
    } else {
      feedback.value = []
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
    isLoading,
  })
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-bold">2. Model Feedback</h2>
      <p class="text-sm text-gray-500"> The AI will ask you some follow up questions to help you clarify the research direction. </p>
    </template>

    <div class="flex flex-col gap-2">
      <div v-if="!feedback.length && !error">Waiting for model feedback...</div>
      <template v-else>
        <div v-if="error" class="text-red-500">{{ error }}</div>
        <div v-for="(feedback, index) in feedback" class="flex flex-col gap-2" :key="index">
          Assistant: {{ feedback.assistantQuestion }}
          <UInput v-model="feedback.userAnswer" />
        </div>
      </template>
      <UButton
        color="primary"
        :loading="isLoadingSearch || isLoading"
        :disabled="isSubmitButtonDisabled"
        block
        @click="$emit('submit', feedback)"
      >
        Submit Answer
      </UButton>
    </div>
  </UCard>
</template>
