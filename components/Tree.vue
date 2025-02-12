<script setup lang="ts">
  import type { ResearchStep } from '~/lib/deep-research'

  export type TreeNodeStatus = Exclude<ResearchStep['type'], 'complete'>

  export type TreeNode = {
    id: string
    /** Label, represents the search query */
    label: string
    researchGoal?: string
    learnings?: string[]
    followUpQuestions?: string[]
    visitedUrls?: string[]
    status?: TreeNodeStatus
    children: TreeNode[]
  }

  const props = defineProps<{
    node: TreeNode
    selectedNode?: TreeNode
  }>()

  const emit = defineEmits<{
    (e: 'select', value: TreeNode): void
  }>()

  const icon = computed(() => {
    const result = { name: '', pulse: false }
    if (!props.node.status) return result

    switch (props.node.status) {
      case 'generating_query':
        result.name = 'i-lucide-clipboard-list'
        result.pulse = true
        break
      case 'generated_query':
        // FIXME: 因为 deepResearch 有并发限制，这个 case 是为了明确区分状态。
        // 但是目前进入这个状态之后再进入 searching 状态，图标不会更新成 search，不知道原因
        // 暂时禁用了这个 case
        // result.name = 'i-lucide-pause'
        // result.pulse = true
        // break
      case 'searching':
        result.name = 'i-lucide-search'
        result.pulse = true
        break
      case 'search_complete':
        result.name = 'i-lucide-search-check'
        break
      case 'processing_serach_result':
        result.name = 'i-lucide-brain'
        result.pulse = true
        break
      case 'processed_search_result':
        result.name = 'i-lucide-circle-check-big'
        break
      case 'error':
        result.name = 'i-lucide-octagon-x'
        break
    }
    return result
  })
</script>

<template>
  <div class="flex items-center gap-1">
    <UIcon name="i-lucide-circle-dot" />
    <UButton
      :class="['max-w-90 shrink-0', icon.pulse && 'animate-pulse']"
      :icon="icon.name"
      size="sm"
      :color="selectedNode?.id === node.id ? 'primary' : 'info'"
      :variant="selectedNode?.id === node.id ? 'soft' : 'outline'"
      @click="emit('select', node)"
    >
      {{ node.label }}
    </UButton>
    <ol v-if="node.children.length > 0" class="flex flex-col gap-y-2">
      <li v-for="node in node.children" :key="node.id">
        <Tree
          class="ml-2"
          :node="node"
          :selected-node
          @select="emit('select', $event)"
        />
      </li>
    </ol>
  </div>
</template>
