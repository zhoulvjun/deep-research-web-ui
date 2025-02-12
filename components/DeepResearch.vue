<script setup lang="ts">
  import {
    deepResearch,
    type PartialSearchResult,
    type ResearchResult,
    type ResearchStep,
  } from '~/lib/deep-research'
  import type { TreeNode } from './Tree.vue'
  import { marked } from 'marked'

  const { t } = useI18n()
  const emit = defineEmits<{
    (e: 'complete', results: ResearchResult): void
  }>()

  const tree = ref<TreeNode>({
    id: '0',
    label: t('webBrowsing.startNode.label'),
    children: [],
  })
  const selectedNode = ref<TreeNode>()
  const searchResults = ref<Record<string, PartialSearchResult>>({})
  const isLoading = ref(false)

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
      case 'generating_query': {
        if (!node) {
          // 创建新节点
          node = {
            id: nodeId,
            label: t('webBrowsing.generating'),
            researchGoal: t('webBrowsing.generating'),
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
          node.label = step.result.query ?? t('webBrowsing.generating')
          node.researchGoal = step.result.researchGoal
        }
        break
      }

      case 'generated_query': {
        break
      }

      case 'searching': {
        break
      }

      case 'search_complete': {
        if (node) {
          node.visitedUrls = step.urls
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
        emit('complete', step)
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

  async function startResearch(query: string, depth: number, breadth: number) {
    tree.value.children = []
    selectedNode.value = undefined
    searchResults.value = {}
    isLoading.value = true
    try {
      await deepResearch({
        query,
        maxDepth: depth,
        breadth,
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
        <USeparator :label="t('webBrowsing.nodeDetails')" />
        <h2 class="text-xl font-bold mt-2">{{ selectedNode.label }}</h2>

        <!-- Root node has no additional information -->
        <p v-if="selectedNode.id === '0'">
          {{ t('webBrowsing.startNode.description') }}
        </p>
        <template v-else>
          <h3 class="text-lg font-semibold mt-2">
            {{ t('webBrowsing.researchGoal') }}
          </h3>
          <p class="whitespace-pre-wrap">{{ selectedNode.researchGoal }}</p>

          <h3 class="text-lg font-semibold mt-2">
            {{ t('webBrowsing.visitedUrls') }}
          </h3>
          <ul class="list-disc list-inside">
            <li v-for="(url, index) in selectedNode.visitedUrls" :key="index">
              <UButton
                class="!p-0 break-all whitespace-pre-wrap"
                variant="link"
                :href="url"
                target="_blank"
              >
                {{ url }}
              </UButton>
            </li>
          </ul>

          <h3 class="text-lg font-semibold mt-2">
            {{ t('webBrowsing.learnings') }}
          </h3>
          <ul class="list-disc list-inside">
            <li
              v-for="(learning, index) in selectedNode.learnings"
              :key="index"
              v-html="marked(learning)"
            ></li>
          </ul>
        </template>
      </div>
    </div>
  </UCard>
</template>
