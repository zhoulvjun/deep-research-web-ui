<script setup lang="ts">
  import { deepResearch, type PartialSearchResult, type ResearchStep } from '~/lib/deep-research'
  import type { TreeNode } from './Tree.vue'

  const tree = ref<TreeNode>({
    id: '0',
    label: 'Start',
    children: [],
  })
  const selectedNode = ref<TreeNode | null>(null)
  const searchResults = ref<Record<string, PartialSearchResult>>({})

  const modelValue = computed(() => Object.values(searchResults.value))

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
    console.log('step', step)

    switch (step.type) {
      case 'generating_query': {
        if (!node) {
          console.error('Creating new node', {
            nodeId,
          })
          // 创建新节点
          node = {
            id: nodeId,
            label: 'Generating...',
            researchGoal: 'Generating research goal...',
            learnings: [],
            children: [],
          }
          const parentNodeId = getParentNodeId(nodeId)
          // 如果是根节点的直接子节点
          if (parentNodeId === '0') {
            tree.value.children.push(node)
          } else {
            // 找到父节点并添加
            const parentNode = findNode(tree.value, getParentNodeId(step.nodeId))
            if (parentNode) {
              parentNode.children.push(node)
            }
          }
        }
        // 更新节点的查询内容
        if (step.result) {
          node.label = step.result.query ?? 'Generating...'
          node.researchGoal = step.result.researchGoal
        }
        break
      }

      case 'generated_query': {
        if (node) {
        }
        break
      }

      case 'searching': {
        if (node) {
          // node.label = `Searching: ${node.query}`
        }
        break
      }

      case 'search_complete': {
        if (node) {
          node.visitedUrls = step.urls
          // node.label = `Found ${step.urls.length} results for: ${node.query}`
        }
        break
      }

      case 'processing_serach_result': {
        if (node) {
          node.learnings = step.result.learnings || []
          node.followUpQuestions = step.result.followUpQuestions || []
        }
        break
      }

      case 'processed_search_result': {
        if (node) {
          node.learnings = step.result.learnings
          searchResults.value[nodeId] = step.result
        }
        break
      }

      case 'error':
        console.error(`Research error on node ${nodeId}:`, step.message)
        break

      case 'complete':
        console.log('Research complete')
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

  // 辅助函数：获取节点的父节点 ID
  function getParentNodeId(nodeId: string): string {
    const parts = nodeId.split('-')
    parts.pop()
    return parts.join('-')
  }

  async function startResearch(
    query: string,
    depth: number,
    breadth: number,
    feedback: { assistantQuestion: string; userAnswer: string }[],
  ) {
    console.log('startResearch', query, depth, breadth, feedback)
    tree.value.children = []
    selectedNode.value = null
    searchResults.value = {}
    try {
      const combinedQuery = `
Initial Query: ${query}
Follow-up Questions and Answers:
${feedback.map((qa) => `Q: ${qa.assistantQuestion}\nA: ${qa.userAnswer}`).join('\n')}
    `
      await deepResearch({
        query: combinedQuery,
        maxDepth: depth,
        breadth,
        onProgress: handleResearchProgress,
      })
    } catch (error) {
      console.error('Research failed:', error)
    }
  }

  defineExpose({
    startResearch,
  })
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-bold">Deep Research</h2>
      <p class="text-sm text-gray-500">Click a child node to view details</p>
    </template>
    <div class="flex flex-col">
      <div class="overflow-y-auto">
        <Tree :node="tree" :selected-node="selectedNode" @select="selectedNode = $event" />
      </div>
      <div v-if="selectedNode" class="p-4">
        <h2 class="text-xl font-bold">{{ selectedNode.label }}</h2>

        <!-- Root node has no additional information -->
        <p v-if="selectedNode.id === '0'"> This is the beginning of your deep research journey! </p>
        <template v-else>
          <h3 class="text-lg font-semibold mt-2">Research Goal:</h3>
          <p>{{ selectedNode.researchGoal }}</p>

          <h3 class="text-lg font-semibold mt-2">Visited URLs:</h3>
          <ul class="list-disc list-inside">
            <li v-for="(url, index) in selectedNode.visitedUrls" :key="index">
              <ULink :href="url" target="_blank">{{ url }}</ULink>
            </li>
          </ul>

          <h3 class="text-lg font-semibold mt-2">Learnings:</h3>
          <ul class="list-disc list-inside">
            <li v-for="(learning, index) in selectedNode.learnings" :key="index">{{ learning }}</li>
          </ul>
        </template>
      </div>
    </div>
  </UCard>
</template>
