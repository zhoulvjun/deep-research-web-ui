<template>
  <div>
    <UContainer>
      <div class="max-w-4xl mx-auto py-8 space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-center mb-2"> Deep Research Assistant </h1>
          <ColorModeButton />
        </div>
        <ResearchForm @submit="generateFeedback" />
        <ResearchFeedback ref="feedbackRef" @submit="startDeepSearch" />
        <DeepResearch ref="deepResearchRef" @complete="generateReport" class="mb-8" />
        <ResearchReport ref="reportRef" />
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import type ResearchFeedback from '~/components/ResearchFeedback.vue'
  import type DeepResearch from '~/components/DeepResearch.vue'
  import type ResearchReport from '~/components/ResearchReport.vue'
  import type { ResearchInputData } from '~/components/ResearchForm.vue'
  import type { ResearchFeedbackResult } from '~/components/ResearchFeedback.vue'
  import type { ResearchResult } from '~/lib/deep-research'

  useHead({
    title: 'Deep Research Web UI',
  })

  const feedbackRef = ref<InstanceType<typeof ResearchFeedback>>()
  const deepResearchRef = ref<InstanceType<typeof DeepResearch>>()
  const reportRef = ref<InstanceType<typeof ResearchReport>>()

  const inputData = ref<ResearchInputData>()
  const feedback = ref<ResearchFeedbackResult[]>([])
  const researchResult = ref<ResearchResult>()

  function getCombinedQuery() {
    return `
Initial Query: ${inputData.value?.query}
Follow-up Questions and Answers:
${feedback.value.map((qa) => `Q: ${qa.assistantQuestion}\nA: ${qa.userAnswer}`).join('\n')}
    `
  }

  async function generateFeedback(data: ResearchInputData) {
    inputData.value = data
    feedbackRef.value?.getFeedback(data.query, data.numQuestions)
  }

  async function startDeepSearch(_feedback: ResearchFeedbackResult[]) {
    if (!inputData.value) return
    feedback.value = _feedback
    deepResearchRef.value?.startResearch(getCombinedQuery(), inputData.value.breadth, inputData.value.depth)
  }

  async function generateReport(_researchResult: ResearchResult) {
    researchResult.value = _researchResult
    reportRef.value?.generateReport({
      prompt: getCombinedQuery(),
      learnings: researchResult.value?.learnings ?? [],
      visitedUrls: researchResult.value?.visitedUrls ?? [],
    })
  }
</script>
