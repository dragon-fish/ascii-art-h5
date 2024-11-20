<template lang="pug">
#full-app-container(min-h-screen, min-w-screen)
  NuxtPage.page-router-view(:data-route='$route.name')
</template>

<script setup lang="ts">
import '@/styles/index.sass'

useHead({
  title: 'ASCII Art Generator',
  meta: [
    { name: 'description', content: 'Convert images to ASCII art' },
    {
      name: 'keywords',
      content: 'ASCII, art, generator, image to text, ascii art, img2txt',
    },
    { name: 'author', content: 'dragon-fish' },
  ],
  script: [{ src: '/stat.js' }],
})

onMounted(() => {
  // @ts-ignore
  if (import.meta.env.DEV && !!window) {
    ;(<any>window).statJS?.()
  }
})
</script>

<style lang="sass">
:root
  color-scheme: dark
</style>
