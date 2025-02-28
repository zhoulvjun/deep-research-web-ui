<script setup lang="ts">
  import { marked } from 'marked'
  import { writeFinalReport } from '~~/lib/deep-research'
  import {
    feedbackInjectionKey,
    formInjectionKey,
    researchResultInjectionKey,
  } from '~/constants/injection-keys'

  const { t, locale } = useI18n()
  const toast = useToast()

  const error = ref('')
  const loading = ref(false)
  const loadingExportPdf = ref(false)
  const loadingExportMarkdown = ref(false)
  const reasoningContent = ref('')
  const reportContent = ref('')
  const reportContainerRef = ref<HTMLElement>()

  // Inject global data from index.vue
  const form = inject(formInjectionKey)!
  const feedback = inject(feedbackInjectionKey)!
  const researchResult = inject(researchResultInjectionKey)!

  const isExportButtonDisabled = computed(
    () =>
      !reportContent.value ||
      loading.value ||
      loadingExportPdf.value ||
      loadingExportMarkdown.value,
  )

  const reportHtml = computed(() => {
    let html = marked(reportContent.value, {
      silent: true,
      gfm: true,
      breaks: true,
      async: false,
    })

    const learnings = researchResult.value?.learnings ?? []

    // 替换引用标记 [数字] 为带有工具提示的 span
    html = html.replace(/\[(\d+)\]/g, (match, number) => {
      const index = parseInt(number) - 1
      const learning =
        index >= 0 && index < learnings.length ? learnings[index] : ''
      if (!learning) return match
      // 使用唯一的 ID 来标识每个 tooltip
      const tooltipId = `tooltip-${index}`

      return `<span class="citation-ref" data-tooltip-id="${tooltipId}" data-tooltip-url="${
        learning.url
      }" data-tooltip-content="${encodeURIComponent(
        learning.title || learning.url,
      )}">
        <a href="${learning.url}" target="_blank">${match}</a>
      </span>`
    })

    return `<style>
        .citation-ref {
          display: inline-block;
          vertical-align: super;
          font-size: 0.75rem;
          font-weight: 500;
          color: #3b82f6;
        }
        .citation-ref a {
          text-decoration: none;
          color: inherit;
        }
      </style>
      ${html}`
  })

  // 在 DOM 更新后设置 tooltip 事件监听
  onMounted(() => {
    nextTick(() => {
      setupTooltips()
    })
  })

  // 监听报告内容变化，重新设置 tooltip
  watch(reportContent, () => {
    nextTick(() => {
      setupTooltips()
    })
  })

  // 设置 tooltip 事件监听
  function setupTooltips() {
    if (!reportContainerRef.value) return

    // 移除现有的 tooltip 元素
    document.querySelectorAll('.citation-tooltip').forEach((el) => el.remove())

    // 创建一个通用的 tooltip 元素
    const tooltip = document.createElement('div')
    tooltip.className =
      'citation-tooltip fixed px-2 py-1 bg-gray-800 text-white text-xs rounded z-50 opacity-0 transition-opacity duration-200 max-w-[calc(100vw-2rem)] overflow-hidden text-ellipsis pointer-events-none'
    document.body.appendChild(tooltip)

    // 为所有引用添加鼠标事件
    const refs = reportContainerRef.value.querySelectorAll('.citation-ref')
    refs.forEach((ref) => {
      ref.addEventListener('mouseenter', (e) => {
        const target = e.currentTarget as HTMLElement
        const content = decodeURIComponent(target.dataset.tooltipContent || '')

        // 设置 tooltip 内容
        tooltip.textContent = content
        tooltip.style.opacity = '1'

        // 计算位置
        const rect = target.getBoundingClientRect()
        const tooltipRect = tooltip.getBoundingClientRect()

        // 默认显示在引用上方
        let top = rect.top - tooltipRect.height - 8
        let left = rect.left + rect.width / 2

        // 如果 tooltip 会超出顶部，则显示在下方
        if (top < 10) {
          top = rect.bottom + 8
        }

        // 确保 tooltip 不会超出左右边界
        const maxLeft = window.innerWidth - tooltipRect.width - 10
        const minLeft = 10
        left = Math.min(Math.max(left, minLeft), maxLeft)

        tooltip.style.top = `${top}px`
        tooltip.style.left = `${left}px`
      })

      ref.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0'
      })
    })
  }

  let printJS: typeof import('print-js') | undefined

  async function generateReport() {
    loading.value = true
    error.value = ''
    reportContent.value = ''
    reasoningContent.value = ''
    try {
      // Store a copy of the data
      const learnings = [...researchResult.value.learnings]
      console.log(`[generateReport] Generating report. Learnings:`, learnings)
      const { fullStream } = writeFinalReport({
        prompt: getCombinedQuery(form.value, feedback.value),
        language: t('language', {}, { locale: locale.value }),
        learnings,
      })
      for await (const chunk of fullStream) {
        if (chunk.type === 'reasoning') {
          reasoningContent.value += chunk.textDelta
        } else if (chunk.type === 'text-delta') {
          reportContent.value += chunk.textDelta
        } else if (chunk.type === 'error') {
          error.value = t('researchReport.generateFailed', [
            chunk.error instanceof Error
              ? chunk.error.message
              : String(chunk.error),
          ])
        }
      }
      reportContent.value += `\n\n## ${t(
        'researchReport.sources',
      )}\n\n${learnings
        .map(
          (item, index) =>
            `${index + 1}. [${item.title || item.url}](${item.url})`,
        )
        .join('\n')}`
    } catch (e: any) {
      console.error(`Generate report failed`, e)
      error.value = t('researchReport.generateFailed', [e.message])
    } finally {
      loading.value = false
    }
  }

  async function exportToPdf() {
    // Change the title back
    const cleanup = () => {
      useHead({
        title: 'Deep Research Web UI',
      })
      loadingExportPdf.value = false
    }
    loadingExportPdf.value = true
    // Temporarily change the document title, which will be used as the filename
    useHead({
      title: `Deep Research Report - ${form.value.query ?? 'Untitled'}`,
    })
    // Wait after title is changed
    await new Promise((r) => setTimeout(r, 100))

    if (!printJS) {
      printJS = (await import('print-js')).default
    }

    printJS({
      printable: reportHtml.value,
      type: 'raw-html',
      showModal: true,
      onIncompatibleBrowser() {
        toast.add({
          title: t('researchReport.incompatibleBrowser'),
          description: t('researchReport.incompatibleBrowserDescription'),
          duration: 10_000,
        })
        cleanup()
      },
      onError(error, xmlHttpRequest) {
        console.error(`[Export PDF] failed:`, error, xmlHttpRequest)
        toast.add({
          title: t('researchReport.exportFailed'),
          description: error instanceof Error ? error.message : String(error),
          duration: 10_000,
        })
        cleanup()
      },
      onPrintDialogClose() {
        cleanup()
      },
    })
    return
  }

  async function exportToMarkdown() {
    if (!reportContent.value) return

    loadingExportMarkdown.value = true
    try {
      // 使用原始的 Markdown 内容，它已经包含了 [1], [2] 等引用角标
      const blob = new Blob([reportContent.value], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `research-report-${
        new Date().toISOString().split('T')[0]
      }.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export to Markdown failed:', error)
    } finally {
      loadingExportMarkdown.value = false
    }
  }

  defineExpose({
    generateReport,
    exportToPdf,
    exportToMarkdown,
  })
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-bold">{{ $t('researchReport.title') }}</h2>
        <UButton
          icon="i-lucide-refresh-cw"
          :loading
          variant="ghost"
          @click="generateReport"
        >
          {{ $t('researchReport.regenerate') }}
        </UButton>
      </div>
    </template>

    <UAlert
      v-if="error"
      :title="$t('researchReport.exportFailed')"
      :description="error"
      color="error"
      variant="soft"
    />

    <div class="flex mb-4 justify-end">
      <UButton
        color="info"
        variant="ghost"
        icon="i-lucide-download"
        size="sm"
        :disabled="isExportButtonDisabled"
        :loading="loadingExportMarkdown"
        @click="exportToMarkdown"
      >
        {{ $t('researchReport.exportMarkdown') }}
      </UButton>
      <UButton
        color="info"
        variant="ghost"
        icon="i-lucide-download"
        size="sm"
        :disabled="isExportButtonDisabled"
        :loading="loadingExportPdf"
        @click="exportToPdf"
      >
        {{ $t('researchReport.exportPdf') }}
      </UButton>
    </div>

    <ReasoningAccordion
      v-if="reasoningContent"
      v-model="reasoningContent"
      class="mb-4"
      :loading="loading"
    />

    <div
      ref="reportContainerRef"
      v-if="reportContent"
      class="prose prose-sm max-w-none break-words p-6 bg-gray-50 dark:bg-gray-800 dark:prose-invert dark:text-white rounded-lg shadow"
      v-html="reportHtml"
    />
    <div v-else>
      {{
        loading ? $t('researchReport.generating') : $t('researchReport.waiting')
      }}
    </div>
  </UCard>
</template>
