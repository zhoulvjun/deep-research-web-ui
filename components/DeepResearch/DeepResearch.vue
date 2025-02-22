<script setup lang="ts">
  import {
    deepResearch,
    type PartialProcessedSearchResult,
    type ResearchStep,
  } from '~/lib/deep-research'
  import { marked } from 'marked'
  import {
    feedbackInjectionKey,
    formInjectionKey,
    researchResultInjectionKey,
  } from '~/constants/injection-keys'
  import Flow from './SearchFlow.vue'
  import SearchFlow from './SearchFlow.vue'
  import { isChildNode, isParentNode, isRootNode } from '~/utils/tree-node'

  export type DeepResearchNodeStatus = Exclude<ResearchStep['type'], 'complete'>

  export type DeepResearchNode = {
    id: string
    /** Label, represents the search query. Generated from parent node. */
    label: string
    /** The research goal of this node. Generated from parent node. */
    researchGoal?: string
    /** Reasoning content when generating queries for the next iteration. */
    generateQueriesReasoning?: string
    /** Reasoning content when generating learnings for this iteration. */
    generateLearningsReasoning?: string
    searchResults?: WebSearchResult[]
    /** Learnings from search results */
    learnings?: string[]
    status?: DeepResearchNodeStatus
    error?: string
  }

  const emit = defineEmits<{
    (e: 'complete'): void
  }>()

  const toast = useToast()
  const { t, locale } = useI18n()
  const { config } = storeToRefs(useConfigStore())

  const flowRef = ref<InstanceType<typeof Flow>>()
  const rootNode: DeepResearchNode = { id: '0', label: 'Start' }
  // The complete search data.
  // There's another tree stored in SearchNode.vue, with only basic data (id, status, ...)
  const nodes = ref<DeepResearchNode[]>([{ ...rootNode }])
  const selectedNodeId = ref<string>()
  const searchResults = ref<Record<string, PartialProcessedSearchResult>>({})
  const isLoading = ref(false)

  const selectedNode = computed(() => {
    if (selectedNodeId.value) {
      return nodes.value.find((n) => n.id === selectedNodeId.value)
    }
  })

  // Inject global data from index.vue
  const form = inject(formInjectionKey)!
  const feedback = inject(feedbackInjectionKey)!
  const completeResult = inject(researchResultInjectionKey)!

  function handleResearchProgress(step: ResearchStep) {
    let node: DeepResearchNode | undefined
    let nodeId = ''

    if (step.type !== 'complete') {
      nodeId = step.nodeId
      node = nodes.value.find((n) => n.id === nodeId)
      if (node && node.status !== step.type) {
        // FIXME: currently `node_complete` is always triggered last,
        // so error is possibly overridden
        if (node.status === 'error') {
          return
        }
        node.status = step.type
        flowRef.value?.updateNode(nodeId, {
          status: step.type,
        })
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
          node = {
            id: nodeId,
            label: step.result.query ?? '',
            researchGoal: '',
            learnings: [],
          }
          const parentNodeId = step.parentNodeId
          nodes.value.push(node)
          flowRef.value?.addNode(
            nodeId,
            {
              title: node.label,
              status: node.status,
            },
            parentNodeId,
          )
        } else {
          if (node.label !== step.result.query) {
            flowRef.value?.updateNode(nodeId, {
              title: step.result.query ?? '',
            })
          }
        }
        // Update the node
        if (!isRootNode(node.id)) {
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
          node.searchResults = step.results
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

      case 'node_complete': {
        console.log(
          `[DeepResearch] node ${nodeId} processed_search_result:`,
          step,
        )
        if (node && step.result) {
          node.learnings = step.result.learnings
          searchResults.value[nodeId] = step.result
        }
        break
      }

      case 'error':
        console.error(
          `[DeepResearch] node ${nodeId} error:`,
          node,
          step.message,
        )
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

  function selectNode(nodeId: string) {
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = undefined
    } else {
      selectedNodeId.value = nodeId
    }
  }

  async function startResearch(retryNode?: DeepResearchNode) {
    if (!form.value.query || !form.value.breadth || !form.value.depth) return

    // 如果不是重试，清空所有节点
    if (!retryNode) {
      nodes.value = [{ ...rootNode }]
      selectedNodeId.value = undefined
      searchResults.value = {}
      flowRef.value?.clearNodes()
      isLoading.value = true
    }

    // Wait after the flow is cleared
    await new Promise((r) => requestAnimationFrame(r))

    try {
      let query = getCombinedQuery(form.value, feedback.value)
      let existingLearnings: string[] = []
      let existingVisitedUrls: string[] = []
      let currentDepth = 1
      let breadth = form.value.breadth

      if (retryNode) {
        query = retryNode.label
        // Set the search depth and breadth to its parent's
        if (!isRootNode(retryNode.id)) {
          const parentId = parentNodeId(retryNode.id)!
          currentDepth = nodeDepth(parentId)
          breadth = searchBreadth(breadth, parentId)
        }
        // Collect all parent nodes' learnings and visitedUrls
        const parentNodes = nodes.value.filter((n) =>
          isParentNode(n.id, retryNode.id),
        )
        existingLearnings = parentNodes
          .flatMap((n) => n.learnings || [])
          .filter(Boolean)
        existingVisitedUrls = parentNodes
          .flatMap((n) => n.searchResults || [])
          .map((r) => r.url)
          .filter(Boolean)
      }

      await deepResearch({
        query,
        retryNode,
        currentDepth,
        breadth,
        maxDepth: form.value.depth,
        languageCode: locale.value,
        learnings: existingLearnings,
        visitedUrls: existingVisitedUrls,
        onProgress: handleResearchProgress,
      })
    } catch (error) {
      console.error('Research failed:', error)
    } finally {
      if (!retryNode) {
        isLoading.value = false
      }
    }
  }

  async function retryNode(nodeId: string) {
    console.log('[DeepResearch] retryNode', nodeId, isLoading.value)
    if (!nodeId || isLoading.value) return

    // Remove all child nodes first
    nodes.value = nodes.value.filter((n) => !isChildNode(nodeId, n.id))
    flowRef.value?.removeChildNodes(nodeId)

    const node = nodes.value.find((n) => n.id === nodeId)
    // Take a clone of the node
    // Used in `deepResearch()` to access the node's original query and searchGoal
    let nodeCurrentData: DeepResearchNode | undefined

    if (node) {
      nodeCurrentData = { ...node }
      node.status = undefined
      node.error = undefined
      node.searchResults = undefined
      node.learnings = undefined
      node.generateLearningsReasoning = undefined
      node.generateQueriesReasoning = undefined

      // Remove related search results
      delete searchResults.value[nodeId]
      Object.keys(searchResults.value).forEach((key) => {
        if (isChildNode(nodeId, key)) {
          delete searchResults.value[key]
        }
      })
    }

    await startResearch(nodeCurrentData)
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
        <SearchFlow
          ref="flowRef"
          :selected-node-id="selectedNodeId"
          @node-click="selectNode"
        />
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
          :actions="[{
            label: $t('webBrowsing.retry'),
            color: 'secondary',
            onClick: () => retryNode(selectedNode!.id),
          }]"
        />
        <h2 class="text-xl font-bold my-2">
          {{ selectedNode.label ?? $t('webBrowsing.generating') }}
        </h2>

        <!-- Research goal -->
        <h3 class="text-lg font-semibold mt-2">
          {{ t('webBrowsing.researchGoal') }}
        </h3>
        <!-- Root node has no additional information -->
        <p v-if="isRootNode(selectedNode.id)">
          {{ t('webBrowsing.startNode.description') }}
        </p>
        <p
          v-if="selectedNode.researchGoal"
          class="prose max-w-none dark:prose-invert"
          v-html="marked(selectedNode.researchGoal, { gfm: true })"
        />

        <!-- Visited URLs -->
        <h3 class="text-lg font-semibold mt-2">
          {{ t('webBrowsing.visitedUrls') }}
        </h3>
        <ul
          v-if="selectedNode.searchResults?.length"
          class="list-disc list-inside"
        >
          <li
            v-for="(item, index) in selectedNode.searchResults"
            class="whitespace-pre-wrap break-all"
            :key="index"
          >
            <UButton
              class="!p-0 contents"
              variant="link"
              :href="item.url"
              target="_blank"
            >
              {{ item.title || item.url }}
            </UButton>
          </li>
        </ul>
        <span v-else> - </span>

        <!-- Learnings -->
        <h3 class="text-lg font-semibold mt-2">
          {{ t('webBrowsing.learnings') }}
        </h3>

        <ReasoningAccordion
          v-if="selectedNode.generateLearningsReasoning"
          v-model="selectedNode.generateLearningsReasoning"
          class="my-2"
          :loading="
            selectedNode.status === 'processing_serach_result_reasoning' ||
            selectedNode.status === 'processing_serach_result'
          "
        />
        <p
          v-for="(learning, index) in selectedNode.learnings"
          class="prose max-w-none dark:prose-invert"
          :key="index"
          v-html="marked(`- ${learning}`, { gfm: true })"
        />
        <span v-if="!selectedNode.learnings?.length"> - </span>

        <!-- Follow up questions -->
        <!-- Only show if there is reasoning content. Otherwise the follow-ups are basically just child nodes. -->
        <template v-if="selectedNode.generateQueriesReasoning">
          <h3 class="text-lg font-semibold my-2">
            {{ t('webBrowsing.followUpQuestions') }}
          </h3>

          <!-- Set loading default to true, because currently don't know how to handle it otherwise -->
          <ReasoningAccordion
            v-if="selectedNode.generateQueriesReasoning"
            v-model="selectedNode.generateQueriesReasoning"
            :loading="
              selectedNode.status === 'generating_query_reasoning' ||
              selectedNode.status === 'generating_query'
            "
          />
        </template>
      </div>
    </div>
  </UCard>
</template>
