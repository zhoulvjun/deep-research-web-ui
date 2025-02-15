<script setup lang="ts">
  import {
    deepResearch,
    type PartialSearchResult,
    type ResearchStep,
  } from '~/lib/deep-research'
  import type { TreeNode } from './Tree.vue'
  import { marked } from 'marked'
  import {
    feedbackInjectionKey,
    formInjectionKey,
    researchResultInjectionKey,
  } from '~/constants/injection-keys'

  const emit = defineEmits<{
    (e: 'complete'): void
  }>()

  const toast = useToast()
  const { t, locale } = useI18n()
  const { config } = storeToRefs(useConfigStore())

  const tree = ref<TreeNode>({
    id: '0',
    label: t('webBrowsing.startNode.label'),
    children: [],
  })
  const selectedNode = ref<TreeNode>()
  const searchResults = ref<Record<string, PartialSearchResult>>({})
  const isLoading = ref(false)

  // Inject global data from index.vue
  const form = inject(formInjectionKey)!
  const feedback = inject(feedbackInjectionKey)!
  const completeResult = inject(researchResultInjectionKey)!

  function handleResearchProgress(step: ResearchStep) {
    let node: TreeNode | null = null
    let nodeId = ''

    if (step.type !== 'complete') {
      nodeId = step.nodeId
      node = findNode(tree.value, step.nodeId)
      if (node) {
        node.status = step.type
      }
    }

    switch (step.type) {
      case 'generating_query_reasoning': {
        if (node) {
          node.generateQueriesReasoning =
            (node.generateQueriesReasoning ?? '') + step.delta
        }
        break
      }

      case 'generating_query': {
        if (!node) {
          // 创建新节点
          node = {
            id: nodeId,
            label: '',
            researchGoal: '',
            learnings: [],
            children: [],
          }
          const parentNodeId = getParentNodeId(nodeId)
          // 如果是根节点的直接子节点
          if (parentNodeId === '0') {
            tree.value.children.push(node)
          } else {
            // 找到父节点并添加
            const parentNode = findNode(
              tree.value,
              getParentNodeId(step.nodeId),
            )
            if (parentNode) {
              parentNode.children.push(node)
            }
          }
        }
        // 更新节点的查询内容
        if (step.result) {
          node.label = step.result.query ?? ''
          node.researchGoal = step.result.researchGoal
        }
        break
      }

      case 'generated_query': {
        console.log(`[DeepResearch] node ${nodeId} generated query:`, step)
        break
      }

      case 'searching': {
        console.log(`[DeepResearch] node ${nodeId} searching:`, step)
        break
      }

      case 'search_complete': {
        console.log(`[DeepResearch] node ${nodeId} search complete:`, step)
        if (node) {
          node.visitedUrls = step.urls
        }
        break
      }

      case 'processing_serach_result_reasoning': {
        if (node) {
          node.generateLearningsReasoning =
            (node.generateLearningsReasoning ?? '') + step.delta
        }
        break
      }

      case 'processing_serach_result': {
        if (node) {
          node.learnings = step.result.learnings || []
        }
        break
      }

      case 'processed_search_result': {
        console.log(
          `[DeepResearch] node ${nodeId} processed_search_result:`,
          step,
        )
        if (node) {
          node.learnings = step.result.learnings
          searchResults.value[nodeId] = step.result
        }
        break
      }

      case 'error':
        console.error(`[DeepResearch] node ${nodeId} error:`, step.message)
        node!.error = step.message
        toast.add({
          title: t('webBrowsing.nodeFailedToast', {
            label: node!.label ?? nodeId,
          }),
          description: step.message,
          color: 'error',
          duration: 8000,
        })
        break

      case 'complete':
        console.log(`[DeepResearch] complete:`, step)
        completeResult.value = {
          learnings: step.learnings,
          visitedUrls: step.visitedUrls,
        }
        emit('complete')
        isLoading.value = false
        break
    }
  }

  // 辅助函数：根据节点ID查找节点
  function findNode(root: TreeNode, targetId: string): TreeNode | null {
    if (!targetId) return null
    if (root.id === targetId) {
      return root
    }
    for (const child of root.children) {
      const found = findNode(child, targetId)
      if (found) {
        return found
      }
    }
    return null
  }

  function selectNode(node: TreeNode) {
    if (selectedNode.value?.id === node.id) {
      selectedNode.value = undefined
    } else {
      selectedNode.value = node
    }
  }

  // 辅助函数：获取节点的父节点 ID
  function getParentNodeId(nodeId: string): string {
    const parts = nodeId.split('-')
    parts.pop()
    return parts.join('-')
  }

  async function startResearch() {
    if (!form.value.query || !form.value.breadth || !form.value.depth) return

    tree.value.children = []
    selectedNode.value = undefined
    searchResults.value = {}
    isLoading.value = true
    // Clear the root node's reasoning content
    tree.value.generateQueriesReasoning = ''
    try {
      const searchLanguage = config.value.webSearch.searchLanguage
        ? t('language', {}, { locale: config.value.webSearch.searchLanguage })
        : undefined
      await deepResearch({
        query: getCombinedQuery(form.value, feedback.value),
        maxDepth: form.value.depth,
        breadth: form.value.breadth,
        language: t('language', {}, { locale: locale.value }),
        searchLanguage,
        onProgress: handleResearchProgress,
      })
    } catch (error) {
      console.error('Research failed:', error)
    } finally {
      isLoading.value = false
    }
  }

  defineExpose({
    startResearch,
    isLoading,
  })
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-bold">{{ t('webBrowsing.title') }}</h2>
      <p class="text-sm text-gray-500">
        {{ t('webBrowsing.description') }}
        <br />
        {{ t('webBrowsing.clickToView') }}
      </p>
    </template>
    <div class="flex flex-col">
      <div class="overflow-y-auto">
        <Tree :node="tree" :selected-node="selectedNode" @select="selectNode" />
      </div>
      <div v-if="selectedNode" class="p-4">
        <USeparator :label="$t('webBrowsing.nodeDetails')" />
        <UAlert
          v-if="selectedNode.error"
          class="my-2"
          :title="$t('webBrowsing.nodeFailed')"
          :description="selectedNode.error"
          color="error"
          variant="soft"
          :duration="8000"
        />
        <h2 class="text-xl font-bold my-2">
          {{ selectedNode.label ?? $t('webBrowsing.generating') }}
        </h2>

        <!-- Set loading default to true, because currently don't know how to handle it otherwise -->
        <ReasoningAccordion
          v-model="selectedNode.generateQueriesReasoning"
          loading
        />

        <!-- Research goal -->
        <h3 class="text-lg font-semibold mt-2">
          {{ t('webBrowsing.researchGoal') }}
        </h3>
        <!-- Root node has no additional information -->
        <p v-if="selectedNode.id === '0'">
          {{ t('webBrowsing.startNode.description') }}
        </p>
        <template v-else>
          <p
            v-if="selectedNode.researchGoal"
            class="prose max-w-none dark:prose-invert"
            v-html="marked(selectedNode.researchGoal, { gfm: true })"
          />

          <!-- Visited URLs -->
          <h3 class="text-lg font-semibold mt-2">
            {{ t('webBrowsing.visitedUrls') }}
          </h3>
          <ul class="list-disc list-inside">
            <li
              v-for="(url, index) in selectedNode.visitedUrls"
              class="whitespace-pre-wrap break-all"
              :key="index"
            >
              <UButton
                class="!p-0 contents"
                variant="link"
                :href="url"
                target="_blank"
              >
                {{ url }}
              </UButton>
            </li>
          </ul>

          <!-- Learnings -->
          <h3 class="text-lg font-semibold mt-2">
            {{ t('webBrowsing.learnings') }}
          </h3>

          <ReasoningAccordion
            v-if="selectedNode.generateQueriesReasoning"
            v-model="selectedNode.generateQueriesReasoning"
            class="my-2"
            loading
          />
          <p
            v-for="(learning, index) in selectedNode.learnings"
            class="prose max-w-none dark:prose-invert"
            :key="index"
            v-html="marked(`- ${learning}`, { gfm: true })"
          />
        </template>
      </div>
    </div>
  </UCard>
</template>
