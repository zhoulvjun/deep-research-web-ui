<script setup lang="ts">
  import { marked } from 'marked'
  import { writeFinalReport, type WriteFinalReportParams } from '~/lib/deep-research'

  interface CustomReportParams extends WriteFinalReportParams {
    visitedUrls: string[]
  }

  const error = ref('')
  const loading = ref(false)
  const loadingExportPdf = ref(false)
  const reportContent = ref('')
  const reportHtml = computed(() => marked(reportContent.value))
  const isExportButtonDisabled = computed(() => !reportContent.value || loading.value || loadingExportPdf.value)

  async function generateReport(params: CustomReportParams) {
    loading.value = true
    error.value = ''
    reportContent.value = ''
    try {
      for await (const chunk of writeFinalReport(params).textStream) {
        reportContent.value += chunk
      }
      reportContent.value += `\n\n## Sources\n\n${params.visitedUrls.map((url) => `- ${url}`).join('\n')}`
    } catch (e: any) {
      console.error(`Generate report failed`, e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function exportToPdf() {
    loadingExportPdf.value = true
    try {
      // 动态导入 html2pdf，确保只在客户端执行
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default

      const element = document.getElementById('report-content')

      if (element) {
        const opt = {
          margin: [10, 10],
          filename: 'research-report.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }

        await html2pdf().set(opt).from(element).save()
      }
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
        <h2 class="font-bold">4. Research Report</h2>
        <UButton
          color="info"
          variant="ghost"
          icon="i-lucide-download"
          :disabled="isExportButtonDisabled"
          :loading="loadingExportPdf"
          @click="exportToPdf"
        >
          Export PDF
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
      <div v-else>{{ loading ? 'Generating report...' : 'Waiting for report..' }}.</div>
    </template>
  </UCard>
</template>
