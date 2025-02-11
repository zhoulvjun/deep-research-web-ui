<template>
  <div class="max-w-4xl mx-auto">
    <UCard>
      <div class="flex flex-col gap-2">
        <UFormField label="Research Topic" required>
          <UTextarea class="w-full" v-model="input" :rows="3" placeholder="Enter the topic you want to research..." required />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Breadth" help="Suggested range: 3-10">
            <UInput v-model="breadth" class="w-full" type="number" :min="3" :max="10" :step="1" />
          </UFormField>

          <UFormField label="Depth" help="Suggested range: 1-5">
            <UInput v-model="depth" class="w-full" type="number" :min="1" :max="5" :step="1" />
          </UFormField>

          <UFormField label="Number of Questions" help="Suggested range: 1-10">
            <UInput v-model="numQuestions" class="w-full" type="number" :min="1" :max="5" :step="1" />
          </UFormField>
        </div>
      </div>

      <template #footer>
        <UButton type="submit" color="primary" :loading="isLoading" block @click="handleSubmit">
          {{ isLoading ? 'Researching...' : 'Start Research' }}
        </UButton>
      </template>
    </UCard>

    <div v-if="result" class="mt-8">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">研究报告</h2>
            <UButton color="info" variant="ghost" icon="i-heroicons-document-duplicate" @click="copyReport" />
          </div>
        </template>
        <div class="prose max-w-none dark:prose-invert" v-html="renderedReport"></div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { marked } from 'marked'
  import { UFormField } from '#components'

  export interface ResearchInputData {
    query: string
    breadth: number
    depth: number
    numQuestions: number
  }

  const emit = defineEmits<{
    (e: 'submit', value: ResearchInputData): void
  }>()

  const input = ref('天空为什么是蓝的？')
  const breadth = ref(3)
  const depth = ref(2)
  const numQuestions = ref(1)
  const isLoading = ref(false)
  const result = ref<any>(null)
  const toast = useToast()

  const renderedReport = computed(() => {
    if (!result.value?.report) return ''
    return marked(result.value.report)
  })

  function handleSubmit() {
    emit('submit', {
      query: input.value,
      breadth: breadth.value,
      depth: depth.value,
      numQuestions: numQuestions.value,
    })
  }

  onMounted(() => {
    input.value = '天空为什么是蓝的？' // default
  })

  async function copyReport() {
    if (!result.value?.report) return

    try {
      await navigator.clipboard.writeText(result.value.report)
      toast.add({
        title: '复制成功',
        description: '研究报告已复制到剪贴板',
        icon: 'i-lucide-badge-check',
      })
    } catch (e) {
      toast.add({
        title: '复制失败',
        description: '无法复制到剪贴板',
        icon: 'i-lucide-x',
        color: 'error',
      })
    }
  }
</script>
