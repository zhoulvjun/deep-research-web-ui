<script setup lang="ts">
  const { locale, availableLocales, t, setLocale } = useI18n()

  const localeOptions = availableLocales.map((locale) => ({
    value: locale,
    label: t('language', {}, { locale }),
  }))
</script>

<template>
  <USelect
    icon="i-lucide-languages"
    :model-value="locale"
    :items="localeOptions"
    @update:model-value="setLocale($event)"
  />
</template>
