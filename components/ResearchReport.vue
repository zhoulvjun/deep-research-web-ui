<script setup lang="ts">
  import { marked } from 'marked'
  import {
    writeFinalReport,
    type WriteFinalReportParams,
  } from '~/lib/deep-research'
  import jsPDF from 'jspdf'

  interface CustomReportParams extends WriteFinalReportParams {
    visitedUrls: string[]
  }

  const { t, locale } = useI18n()
  const toast = useToast()

  const error = ref('')
  const loading = ref(false)
  const loadingExportPdf = ref(false)
  const reportContent = ref('')
  const reportHtml = computed(() =>
    marked(reportContent.value, { silent: true, gfm: true, breaks: true }),
  )
  const isExportButtonDisabled = computed(
    () => !reportContent.value || loading.value || loadingExportPdf.value,
  )
  let pdf: jsPDF | undefined

  async function generateReport(params: CustomReportParams) {
    loading.value = true
    error.value = ''
    reportContent.value = ''
    try {
      for await (const chunk of writeFinalReport(params).textStream) {
        reportContent.value += chunk
      }
      reportContent.value += `\n\n## ${t(
        'researchReport.sources',
      )}\n\n${params.visitedUrls.map((url) => `- ${url}`).join('\n')}`
    } catch (e: any) {
      console.error(`Generate report failed`, e)
      error.value = t('researchReport.error', [e.message])
    } finally {
      loading.value = false
    }
  }

  async function exportToPdf() {
    const element = document.getElementById('report-content')
    if (!element) return

    loadingExportPdf.value = true

    try {
      // 创建 PDF 实例
      if (!pdf) {
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        })
      }

      // Load Chinese font
      if (locale.value === 'zh') {
        try {
          if (!pdf.getFontList().SourceHanSans?.length) {
            toast.add({
              title: t('researchReport.downloadingFonts'),
              duration: 5000,
              color: 'info',
            })
            const fontUrl = '/fonts/SourceHanSansCN-VF.ttf'
            pdf.addFont(fontUrl, 'SourceHanSans', 'normal')
            pdf.setFont('SourceHanSans')
          }
        } catch (e: any) {
          toast.add({
            title: t('researchReport.downloadFontFailed'),
            description: e.message,
            duration: 8000,
            color: 'error',
          })
          console.warn(
            'Failed to load Chinese font, fallback to default font:',
            e,
          )
        }
      }

      // 设置字体大小和行高
      const fontSize = 10.5
      const lineHeight = 1.5
      pdf.setFontSize(fontSize)

      // 设置页面边距（单位：mm）
      const margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      }

      // 获取纯文本内容
      const content = element.innerText

      // 计算可用宽度（mm）
      const pageWidth = pdf.internal.pageSize.getWidth()
      const maxWidth = pageWidth - margin.left - margin.right

      // 分割文本为行
      const lines = pdf.splitTextToSize(content, maxWidth)

      // 计算当前位置
      let y = margin.top

      // 逐行添加文本
      for (const line of lines) {
        // 检查是否需要新页
        if (y > pdf.internal.pageSize.getHeight() - margin.bottom) {
          pdf.addPage()
          y = margin.top
        }

        // 添加文本
        pdf.text(line, margin.left, y)
        y += fontSize * lineHeight
      }

      pdf.save('research-report.pdf')
    } catch (error) {
      console.error('Export to PDF failed:', error)
    } finally {
      loadingExportPdf.value = false
    }
  }

  defineExpose({
    generateReport,
    exportToPdf,
  })
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-bold">{{ $t('researchReport.title') }}</h2>
        <UButton
          color="info"
          variant="ghost"
          icon="i-lucide-download"
          :disabled="isExportButtonDisabled"
          :loading="loadingExportPdf"
          @click="exportToPdf"
        >
          {{ $t('researchReport.exportPdf') }}
        </UButton>
      </div>
    </template>

    <div
      v-if="reportContent"
      id="report-content"
      class="prose prose-sm max-w-none p-6 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-lg shadow"
      v-html="reportHtml"
    />
    <template v-else>
      <div v-if="error" class="text-red-500">{{ error }}</div>
      <div v-else>
        {{
          loading
            ? $t('researchReport.generating')
            : $t('researchReport.waiting')
        }}
      </div>
    </template>
  </UCard>
</template>
