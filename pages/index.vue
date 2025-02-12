<template>
  <div>
    <UContainer>
      <div class="max-w-4xl mx-auto py-8 flex flex-col gap-y-4">
        <div class="flex items-center gap-2">
          <h1 class="text-3xl font-bold text-center mb-2">
            Deep Research Assistant
          </h1>
          <ConfigManager ref="configManagerRef" class="ml-auto" />
          <ColorModeButton />
        </div>

        <div>
          This is a web UI for
          <ULink target="_blank" href="https://github.com/dzhng/deep-research">
            dzhng/deep-research
          </ULink>
          . It features streaming AI responses for realtime feedback, and
          viasualization of the research process using a tree structure.
          <br />
          All API requests are directly sent from your browser. No remote data
          stored.
        </div>

        <ResearchForm
          :is-loading-feedback="!!feedbackRef?.isLoading"
          ref="formRef"
          @submit="generateFeedback"
        />
        <ResearchFeedback
          :is-loading-search="!!deepResearchRef?.isLoading"
          ref="feedbackRef"
          @submit="startDeepSearch"
        />
        <DeepResearch ref="deepResearchRef" @complete="generateReport" />
        <ResearchReport ref="reportRef" />
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import type ResearchForm from '~/components/ResearchForm.vue'
  import type ResearchFeedback from '~/components/ResearchFeedback.vue'
  import type DeepResearch from '~/components/DeepResearch.vue'
  import type ResearchReport from '~/components/ResearchReport.vue'
  import type ConfigManager from '~/components/ConfigManager.vue'
  import type { ResearchInputData } from '~/components/ResearchForm.vue'
  import type { ResearchFeedbackResult } from '~/components/ResearchFeedback.vue'
  import type { ResearchResult } from '~/lib/deep-research'

  const config = useConfigStore()
  const toast = useToast()

  const configManagerRef = ref<InstanceType<typeof ConfigManager>>()
  const formRef = ref<InstanceType<typeof ResearchForm>>()
  const feedbackRef = ref<InstanceType<typeof ResearchFeedback>>()
  const deepResearchRef = ref<InstanceType<typeof DeepResearch>>()
  const reportRef = ref<InstanceType<typeof ResearchReport>>()

  const feedback = ref<ResearchFeedbackResult[]>([])
  const researchResult = ref<ResearchResult>()

  function getCombinedQuery() {
    return `Initial Query: ${formRef.value?.form.query}
Follow-up Questions and Answers:
${feedback.value
  .map((qa) => `Q: ${qa.assistantQuestion}\nA: ${qa.userAnswer}`)
  .join('\n')}
    `
  }

  async function generateFeedback(data: ResearchInputData) {
    const aiConfig = config.config.ai
    const webSearchConfig = config.config.webSearch

    if (!aiConfig.model || !aiConfig.apiKey || !webSearchConfig.apiKey) {
      toast.add({
        title: 'Config not set',
        description: 'Please configure AI and Web Search settings.',
        color: 'error',
      })
      configManagerRef.value?.show()
      return
    }
    feedbackRef.value?.getFeedback(data.query, data.numQuestions)
  }

  async function startDeepSearch(_feedback: ResearchFeedbackResult[]) {
    if (
      !formRef.value?.form.query ||
      !formRef.value?.form.breadth ||
      !formRef.value?.form.depth
    )
      return
    feedback.value = _feedback
    deepResearchRef.value?.startResearch(
      getCombinedQuery(),
      formRef.value.form.breadth,
      formRef.value.form.depth,
    )
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
