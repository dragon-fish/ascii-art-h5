<template lang="pug">
#view-index(
  min-h-screen,
  min-w-screen,
  flex,
  flex-col,
  items-center,
  justify-center
)
  h1 ASCII Art Generator

  main(
    p-6,
    m-4,
    rounded-lg,
    bg='#333',
    shadow-lg,
    w-800px,
    max-w-90vw,
    flex='~ col',
    gap-6
  )
    .flex(items-center, justify-center, gap-6)
      .thumb
        canvas(ref='canvasRef', @click='open()', :width='480', :height='480')

      .configs-panel(flex, flex-col, gap-4)
        .flex
          fieldset
            legend Mode
            .tabs-panel(flex, gap-2)
              .tab(v-for='tab in ["colored", "grayscale"]', :key='tab')
                input(
                  type='radio',
                  :id='tab',
                  :value='tab',
                  v-model='mode',
                  @change='drawArt()'
                )
                label(:for='tab') {{ tab[0].toUpperCase() + tab.slice(1) }}
        .flex.gap-2
          fieldset
            legend Resolution
            input(type='range', min='50', max='200', step='10', v-model='size')
            span {{ size }}

  .flex(
    items-center,
    justify-center,
    gap-2,
    rounded-lg,
    bg='#333',
    shadow-lg,
    w-800px,
    max-w-90vw,
    p-6
  )
    .artwork(v-if='artHTML')
      .overflow-auto(max-w-760px)
        .ascii-art(v-html='artHTML')
      .text-center.m-t-4
        | Time spent: {{ timeSpend }}ms
      .text-center.m-t-4
        button(
          @click='copyToClipboard()',
          bg-black,
          text-white,
          text-5,
          p-x-4,
          p-y-2,
          border-0,
          rounded,
          cursor-pointer
        ) {{ copyBtnMsg }}
    .text-center(v-else) Your ASCII art will be displayed here

  footer.text-center.mt-4
    | Copyright © {{ copyrightYear }}
    |
    a(href='https://github.com/dragon-fish/ascii-art-h5') ASCII Art Generator
    |
    | |
    |
    | Made with ❤️ by
    |
    a(href='https://github.com/dragon-fish') @dragon-fish
</template>

<script setup lang="ts">
import { ASCIIArtCanvas } from '#build/imports'

const canvasRef = ref()
const canvasEl = useCurrentElement<HTMLCanvasElement>(canvasRef)

const currentFile = ref<File | null>(null)
const mode = ref('colored')
const size = ref(120)
const { width: windowWidth } = useWindowSize()
const fontSize = computed(() =>
  Math.floor((windowWidth.value * 0.9) / size.value)
)
const artHTML = ref('')
const timeSpend = ref('')

let art: ASCIIArtCanvas | null = null

onMounted(async () => {
  if (!globalThis.window) return

  await nextTick()
  console.info(canvasEl.value)
  art = new ASCIIArtCanvas(canvasEl.value)

  // draw "click to upload" text
  art.ctx.fillStyle = '#888'
  art.ctx.font =
    '28pt -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  art.ctx.textAlign = 'center'
  art.ctx.fillText('Click to upload an image', art.width / 2, art.height / 2)

  // try to insert default image?
  try {
    const defaultImage = await fetch('/avatar.jpg')
    const blob = await defaultImage.blob()
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    currentFile.value = file
  } catch (e) {
    console.warn('Failed to load default image:', e)
  }
})
onBeforeUnmount(() => {
  art?.destroy()
})

async function drawArt(file?: File) {
  if (!art) return
  if (!currentFile.value) return

  const start = performance.now()
  const bitmap = await createImageBitmap(file || currentFile.value)
  art.resize(bitmap.width, bitmap.height)
  art.drawImage(bitmap, 0, 0, art.width, art.height)

  switch (mode.value) {
    case 'colored':
      artHTML.value = art.toColoredHTML(size.value)
      break
    case 'grayscale':
      artHTML.value = art.toGrayscaleHTML(size.value)
      break
  }
  timeSpend.value = (performance.now() - start).toFixed(2)

  console.info(
    'Artwork generated:',
    `${art.width}x${art.height} in ${timeSpend.value}ms`
  )
}

const { files, open, reset, onChange } = useFileDialog({
  accept: 'image/*',
  multiple: false,
  reset: true,
})

onChange((files) => {
  if (!files || !files.length) return
  currentFile.value = files[0]
})
watch(currentFile, (file) => {
  if (!file) return
  drawArt(file)
})
watchDebounced(
  size,
  () => {
    drawArt()
  },
  { debounce: 500 }
)
watchDebounced(
  mode,
  () => {
    drawArt()
  },
  { debounce: 500 }
)

const copyBtnMsg = refAutoReset('Copy to clipboard', 2000)
function copyToClipboard() {
  if (!artHTML.value) return
  navigator.clipboard
    .writeText(artHTML.value)
    .then(() => {
      copyBtnMsg.value = 'Code copied!'
    })
    .catch(() => {
      copyBtnMsg.value = 'Something went wrong!'
    })
}

const now = useNow()
const fromYear = 2024
const copyrightYear = computed(() => {
  const year = now.value.getFullYear()
  return year > fromYear ? `${fromYear} - ${year}` : fromYear
})
</script>

<style scoped lang="sass">
canvas
  border: 1px solid #444
  border-radius: 0.25rem
  background-color: #333
  display: block
  margin: 0 auto
  width: 200px
  height: auto
  max-width: 100%
  max-height: 100%
  cursor: pointer

.ascii-art
  font-family: monospace
  font-size: 5pt
  letter-spacing: 0.25em
  line-height: 0.75em
  font-weight: bold
  text-align: center
  padding: 1em
  border-radius: 0.25rem
  overflow: auto
  color: #333
  background-color: #fff
  border: 1px solid #000
  > *
    padding: 0
    margin: 0

fieldset
  border: 1px solid #444
  border-radius: 0.25rem
  legend
    padding: 0 0.25em
    margin-bottom: 0.5em
</style>
