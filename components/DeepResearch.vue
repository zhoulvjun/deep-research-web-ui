<template>
  <div class="h-screen flex">
    <!-- 左侧树形图 -->
    <div class="w-1/2 h-full bg-transparent" ref="treeContainer">
      <div v-if="!modelValue.root" class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div class="text-center">
          <div class="text-lg mb-2">No research data</div>
          <div class="text-sm">Please answer and submit the questions to start research</div>
        </div>
      </div>
      <svg
        v-else
        width="100%"
        height="100%"
        @click="handleSvgClick"
        class="[&_.link]:stroke-2 [&_.link]:fill-none [&_.link]:stroke-gray-400 dark:[&_.link]:stroke-gray-600 [&_.link.processing]:stroke-blue-500 [&_.link.complete]:stroke-green-500 [&_.link.error]:stroke-red-500"
      >
        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <!-- 连接线 -->
          <g class="links">
            <path v-for="link in treeData.links" :key="link.id" :d="link.path" class="link" :class="link.status" />
          </g>
          <!-- 节点 -->
          <g class="nodes">
            <g
              v-for="node in treeData.nodes"
              :key="node.id"
              class="node cursor-pointer transition-all"
              :class="[node.status, { active: selectedNode?.id === node.id }]"
              :transform="`translate(${node.x}, ${node.y})`"
              @click.stop="handleNodeClick(node)"
              @mouseover="handleNodeHover(node)"
            >
              <circle
                r="20"
                class="fill-white dark:fill-gray-700 stroke-2 stroke-gray-400 dark:stroke-gray-500 [.processing_&]:stroke-blue-500 [.complete_&]:stroke-green-500 [.error_&]:stroke-red-500 [.active_&]:stroke-[3px] [.active_&]:fill-gray-100 dark:[.active_&]:fill-gray-800"
              />
              <text dy=".35em" text-anchor="middle" class="fill-gray-900 dark:fill-gray-100 text-sm select-none">
                {{ node.depth }}
              </text>
            </g>
          </g>
        </g>
      </svg>
    </div>

    <!-- 右侧内容区 -->
    <div class="w-1/2 h-full p-4 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div v-if="selectedNode" class="sticky top-0">
        <h3 class="text-lg font-bold mb-2 dark:text-gray-200">Search Detail</h3>
        <div class="mb-4">
          <div class="font-medium dark:text-gray-300">Query:</div>
          <div class="text-gray-600 dark:text-gray-400">{{ selectedNode.query }}</div>
        </div>
        <div v-if="selectedNode.result">
          <div class="font-medium mb-2 dark:text-gray-300">Learning Content:</div>
          <ul class="list-disc pl-5 mb-4">
            <li v-for="(learning, i) in selectedNode.result.learnings" :key="i" class="text-gray-600 dark:text-gray-400">
              {{ learning }}
            </li>
          </ul>
          <div class="font-medium mb-2 dark:text-gray-300">Follow-up Questions:</div>
          <ul class="list-disc pl-5">
            <li v-for="(question, i) in selectedNode.result.followUpQuestions" :key="i" class="text-gray-600 dark:text-gray-400">
              {{ question }}
            </li>
          </ul>
        </div>
      </div>
      <div v-else class="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-center">
        Select a node to view details
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import * as d3 from 'd3'
  import { deepResearch, type ResearchStep } from '~/lib/deep-research'
  import type { ResearchFeedbackResult } from './ResearchFeedback.vue'

  export interface SearchNode {
    id: string
    query: string
    depth: number
    status: 'pending' | 'processing' | 'complete' | 'error'
    children: SearchNode[]
    result?: {
      learnings: string[]
      followUpQuestions: string[]
    }
    // 布局相关属性
    x?: number
    y?: number
    parent?: SearchNode
  }

  export interface SearchTree {
    root: SearchNode | null
    currentDepth: number
    maxDepth: number
    maxBreadth: number
  }

  const modelValue = defineModel<SearchTree>({
    default: () => ({
      root: null,
      currentDepth: 0,
      maxDepth: 0,
      maxBreadth: 0,
    }),
  })

  // 树形图布局配置
  const margin = { top: 40, right: 40, bottom: 40, left: 40 }
  const treeContainer = ref<HTMLElement>()
  const width = ref(800)
  const height = ref(600)

  // 节点状态管理
  const selectedNode = ref<SearchNode>()

  // 计算节点和连接线
  const treeData = computed(() => {
    if (!modelValue.value.root) return { nodes: [], links: [] }

    // 计算合适的树大小
    const levels = getTreeDepth(modelValue.value.root)
    const estimatedHeight = Math.max(levels * 20, 300) // 每层至少 20px
    height.value = Math.min(estimatedHeight, window.innerHeight - 100) // 限制最大高度

    const treeLayout = d3
      .tree<SearchNode>()
      .size([width.value - margin.left - margin.right, height.value - margin.top - margin.bottom])
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 2))

    const root = d3.hierarchy(modelValue.value.root)
    const layout = treeLayout(root)

    const nodes = layout.descendants().map((d) => ({
      ...d.data,
      x: d.x,
      y: d.y,
    }))

    const links = layout.links().map((d, i) => ({
      id: `link-${i}`,
      path: d3.linkVertical()({
        source: [d.source.x, d.source.y],
        target: [d.target.x, d.target.y],
      }) as string,
      status: d.target.data.status,
    }))

    return { nodes, links }
  })

  // 辅助函数：获取树的深度
  function getTreeDepth(node: SearchNode): number {
    if (!node) return 0
    return 1 + Math.max(0, ...(node.children?.map(getTreeDepth) || []))
  }

  // 监听节点状态变化
  watch(
    () => modelValue.value.root,
    (newRoot) => {
      if (newRoot) {
        // 找到最新更新的节点
        const currentNode = findCurrentNode(newRoot)
        if (currentNode) {
          selectedNode.value = currentNode
        }
      }
    },
    { deep: true },
  )

  // 事件处理
  function handleNodeClick(node: SearchNode) {
    selectedNode.value = node
  }

  function handleNodeHover(node: SearchNode) {
    selectedNode.value = node
  }

  function handleSvgClick() {
    selectedNode.value = undefined
  }

  // 辅助函数：查找指定深度的节点
  function findNodeAtDepth(node: SearchNode | null, targetDepth: number): SearchNode | null {
    if (!node) return null
    if (node.depth === targetDepth) return node
    if (!node.children?.length) return null

    for (const child of node.children) {
      const found = findNodeAtDepth(child, targetDepth)
      if (found) return found
    }
    return null
  }

  // 辅助函数：查找当前正在处理的节点
  function findCurrentNode(node: SearchNode): SearchNode | null {
    if (node.status === 'processing') {
      return node
    }
    if (node.children) {
      for (const child of node.children) {
        const found = findCurrentNode(child)
        if (found) return found
      }
    }
    // 如果没有正在处理的节点，返回最后一个完成的节点
    if (node.status === 'complete' && (!node.children || node.children.length === 0)) {
      return node
    }
    return null
  }

  // 辅助函数：在树中更新节点
  function updateNodeInTree(root: SearchNode, nodeId: string, updates: Partial<SearchNode>): SearchNode {
    if (root.id === nodeId) {
      return { ...root, ...updates }
    }
    return {
      ...root,
      children: root.children.map((child) => updateNodeInTree(child, nodeId, updates)),
    }
  }

  // 监听容器大小变化
  onMounted(() => {
    if (treeContainer.value) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          width.value = entry.contentRect.width
          height.value = entry.contentRect.height
        }
      })
      resizeObserver.observe(treeContainer.value)
    }
  })

  // 处理研究进度
  function handleResearchProgress(step: ResearchStep) {
    console.log(step)
    if (step.type === 'start') {
      // 初始化搜索树
      modelValue.value = {
        root: null,
        currentDepth: 0,
        maxDepth: step.depth || 0,
        maxBreadth: step.breadth || 0,
      }
    } else if (step.type === 'generating_queries' && step.result) {
      // 添加新的查询节点
      if (step.depth === 1) {
        // 第一层查询作为根节点
        modelValue.value = {
          ...modelValue.value,
          root: {
            id: '0-0',
            query: step.result[0].query,
            depth: 0,
            status: 'processing',
            children: step.result.slice(1).map((item, index) => ({
              id: `1-${index}`,
              query: item.query,
              depth: 1,
              status: 'pending',
              children: [],
            })),
          },
        }
      } else {
        const parentNode = findNodeAtDepth(modelValue.value.root!, step.depth! - 1)
        if (parentNode) {
          const updatedRoot = updateNodeInTree(modelValue.value.root!, parentNode.id, {
            children: step.result.map((query: any, index: number) => ({
              id: `${step.depth}-${index}`,
              query: query.query,
              depth: step.depth!,
              status: 'pending',
              children: [],
            })),
          })
          modelValue.value = {
            ...modelValue.value,
            root: updatedRoot,
          }
        }
      }
    } else if (step.type === 'processing_serach_result' && step.result) {
      // 更新节点状态和结果
      const nodeId = `${step.depth}-${step.queryIndex}`
      const updatedRoot = updateNodeInTree(modelValue.value.root!, nodeId, {
        status: 'complete',
        result: {
          learnings: step.result.learnings || [],
          followUpQuestions: step.result.followUpQuestions || [],
        },
      })
      modelValue.value = {
        ...modelValue.value,
        root: updatedRoot,
      }
    } else if (step.type === 'error') {
      // 处理错误状态
      const currentNode = findCurrentNode(modelValue.value.root!)
      if (currentNode) {
        const updatedRoot = updateNodeInTree(modelValue.value.root!, currentNode.id, {
          status: 'error',
        })
        modelValue.value = {
          ...modelValue.value,
          root: updatedRoot,
        }
      }
    }
  }

  // 开始研究
  async function startResearch(query: string, depth: number, breadth: number, feedback: ResearchFeedbackResult[]) {
    modelValue.value = {
      root: null,
      currentDepth: 0,
      maxDepth: 0,
      maxBreadth: 0,
    }
    try {
      const combinedQuery = `
Initial Query: ${query}
Follow-up Questions and Answers:
${feedback.map((qa) => `Q: ${qa.assistantQuestion}\nA: ${qa.userAnswer}`).join('\n')}
    `

      await deepResearch({
        query: combinedQuery,
        depth,
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
