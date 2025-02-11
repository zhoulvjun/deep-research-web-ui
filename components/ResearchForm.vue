<script setup lang="ts">
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
  const breadth = ref(2)
  const depth = ref(2)
  const numQuestions = ref(3)
  const isLoading = ref(false)

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
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-bold">1. Research Topic</h2>
    </template>
    <div class="flex flex-col gap-2">
      <UFormField label="Research Topic" required>
        <UTextarea class="w-full" v-model="input" :rows="3" placeholder="Enter whatever you want to research..." required />
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormField label="Number of Questions">
          <template #help> Number of questions for you to clarify. </template>
          <UInput v-model="numQuestions" class="w-full" type="number" :min="1" :max="5" :step="1" />
        </UFormField>

        <UFormField label="Depth">
          <template #help> How deep you want to dig. </template>
          <UInput v-model="depth" class="w-full" type="number" :min="1" :max="5" :step="1" />
        </UFormField>

        <UFormField label="Breadth">
          <template #help> Number of searches in each depth. </template>
          <UInput v-model="breadth" class="w-full" type="number" :min="1" :max="5" :step="1" />
        </UFormField>
      </div>
    </div>

    <template #footer>
      <UButton type="submit" color="primary" :loading="isLoading" block @click="handleSubmit">
        {{ isLoading ? 'Researching...' : 'Start Research' }}
      </UButton>
    </template>
  </UCard>
</template>
