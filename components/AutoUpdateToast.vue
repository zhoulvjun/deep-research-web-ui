<script setup lang="ts">
  import { useIntervalFn } from '@vueuse/core'
  // @ts-expect-error
  import semverGt from 'semver/functions/gt'
  import type VersionMeta from '~/public/version.json'

  const { t } = useI18n()
  const toast = useToast()
  const runtimeConfig = useRuntimeConfig()

  const interval = 5 * 60 * 1000
  let lastCheck: Date | undefined

  const checkUpdate = async () => {
    if (lastCheck && new Date().getTime() - lastCheck.getTime() < interval) {
      return
    }
    lastCheck = new Date()
    try {
      const response = (await $fetch(
        'https://deep-research.ataw.top/version.json',
      )) as typeof VersionMeta
      if (semverGt(response.version, runtimeConfig.public.version)) {
        toast.add({
          title: t('autoUpdate.newVersionTitle', [response.version]),
          description: t('autoUpdate.newVersionDescription'),
          color: 'info',
          duration: 10_000,
          actions: [
            {
              label: t('autoUpdate.refresh'),
              onClick: () => {
                window.location.reload()
              },
            },
          ],
        })
      }
    } catch (error) {
      console.error('检查更新失败:', error)
    }
  }

  // 每 3 分钟检查一次更新
  const { pause, resume } = useIntervalFn(checkUpdate, interval, {
    immediate: true,
    immediateCallback: true,
  })

  // 当页面不可见时暂停检查
  const visibility = useDocumentVisibility()
  const focus = useWindowFocus()

  watch(
    [visibility, focus],
    ([visible, focused]) => {
      if (visible === 'visible' && focused) {
        resume()
      } else {
        pause()
      }
    },
    { immediate: true },
  )
</script>
