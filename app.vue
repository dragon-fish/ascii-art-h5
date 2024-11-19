<template lang="pug">
#full-app-container(min-h-screen, min-w-screen)
  Head
    Title ASCII Art Generator
    Meta(
      name='keywords',
      content='ASCII, art, generator, image to text, ascii art'
    )
  NuxtPage.page-router-view(:data-route='$route.name')
</template>

<script setup lang="ts">
import '@/styles/index.sass'
</script>

<style scoped lang="sass"></style>
