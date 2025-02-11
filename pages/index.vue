<template>
  <div>
    <UContainer>
      <div class="py-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl font-bold text-center mb-2"> Deep Research Assistant </h1>
          <ColorModeButton></ColorModeButton>
          <ResearchForm @submit="generateFeedback" />
          <ResearchFeedback v-model="result.feedback" ref="feedbackRef" @submit="startDeepSearch" />
          <DeepResearch v-model="searchTree" ref="deepResearchRef" class="mb-8" />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import type ResearchFeedback from '~/components/ResearchFeedback.vue'
  import type DeepResearch from '~/components/DeepResearch.vue'
  import type { ResearchInputData } from '~/components/ResearchForm.vue'
  import type { SearchTree } from '~/components/DeepResearch.vue'
  import type { ResearchFeedbackResult } from '~/components/ResearchFeedback.vue'

  interface DeepResearchResult {
    feedback: Array<ResearchFeedbackResult>
  }

  useHead({
    title: 'Deep Research Assistant - AI 深度研究助手',
    meta: [
      {
        name: 'description',
        content: '基于 AI 的深度研究助手，可以对任何主题进行迭代式深入研究',
      },
    ],
  })

  const inputData = ref<ResearchInputData>()
  const result = ref<DeepResearchResult>({
    feedback: [],
  })
  const searchTree = ref<SearchTree>({
    root: null,
    currentDepth: 0,
    maxDepth: 0,
    maxBreadth: 0,
  })

  const feedbackRef = ref<InstanceType<typeof ResearchFeedback>>()
  const deepResearchRef = ref<InstanceType<typeof DeepResearch>>()

  async function generateFeedback(data: ResearchInputData) {
    inputData.value = data
    feedbackRef.value?.getFeedback(data.query, data.numQuestions)
  }

  async function startDeepSearch() {
    if (!inputData.value) return
    deepResearchRef.value?.startResearch(inputData.value.query, inputData.value.breadth, inputData.value.depth, result.value.feedback)
  }
</script>
