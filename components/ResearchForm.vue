<script setup lang="ts">
  export interface ResearchInputData {
    query: string
    breadth: number
    depth: number
    numQuestions: number
  }

  defineProps<{
    isLoadingFeedback: boolean
  }>()

  const emit = defineEmits<{
    (e: 'submit', value: ResearchInputData): void
  }>()

  const form = reactive({
    query: '',
    breadth: 2,
    depth: 2,
    numQuestions: 3,
  })

  const isSubmitButtonDisabled = computed(() => !form.query || !form.breadth || !form.depth || !form.numQuestions)

  function handleSubmit() {
    emit('submit', {
      ...form,
    })
  }

  defineExpose({
    form,
  })
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-bold">1. Research Topic</h2>
    </template>
    <div class="flex flex-col gap-2">
      <UFormField label="Research Topic" required>
        <UTextarea class="w-full" v-model="form.query" :rows="3" placeholder="Enter whatever you want to research..." required />
      </UFormField>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormField label="Number of Questions" required>
          <template #help> Number of questions for you to clarify. </template>
          <UInput v-model="form.numQuestions" class="w-full" type="number" :min="1" :max="5" :step="1" />
        </UFormField>

        <UFormField label="Depth" required>
          <template #help> How deep you want to dig. </template>
          <UInput v-model="form.depth" class="w-full" type="number" :min="1" :max="5" :step="1" />
        </UFormField>

        <UFormField label="Breadth" required>
          <template #help> Number of searches in each depth. </template>
          <UInput v-model="form.breadth" class="w-full" type="number" :min="1" :max="5" :step="1" />
        </UFormField>
      </div>
    </div>

    <template #footer>
      <UButton type="submit" color="primary" :loading="isLoadingFeedback" :disabled="isSubmitButtonDisabled" block @click="handleSubmit">
        {{ isLoadingFeedback ? 'Researching...' : 'Start Research' }}
      </UButton>
    </template>
  </UCard>
</template>
