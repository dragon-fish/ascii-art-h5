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
    .flex(items-center, justify-center, gap-6, lt-md='flex-col')
      .thumb
        canvas.input-canvas(
          ref='inputCanvasRef',
          @click='open()',
          :width='480',
          :height='480',
          cursor-pointer,
          w-200px,
          h-auto,
          max-w-full,
          max-h-full,
          lt-md='w-full'
        )
        .text-center(@click='open()', font-italic) Click to change image

      .configs-panel(flex, flex-col, gap-4)
        fieldset
          legend Mode
          .tabs-panel(flex, gap-2)
            .tab(v-for='tab in ["colored", "grayscale"]', :key='tab')
              input(type='radio', :id='tab', :value='tab', v-model='mode')
              label(:for='tab') {{ tab[0].toUpperCase() + tab.slice(1) }}
        fieldset
          legend Resolution
          .flex.gap-2
            input(type='range', min='50', max='200', step='10', v-model='size')
            span {{ size }}
        fieldset(:class='{ disabled: mode !== "colored" }')
          legend Letters to use (colored mode)
          .flex
            input(type='text', v-model='coloredHtmlChars', placeholder='@')

  .artwork-result(
    flex,
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
    .artwork(v-if='1')
      //- .overflow-auto(max-w-760px)
      //-   pre.ascii-art(v-html='artHTML')
      canvas.output-canvas(
        ref='outputCanvasRef',
        width='600',
        height='600',
        w-600px,
        h-auto,
        max-w-full,
        bg-white
      )
      .text-center.m-t-4
        | Time spent: {{ timeSpentMsg }}ms
      .m-t-4.flex.gap-4.items-center.justify-center
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
        button(
          @click='saveOutputImage()',
          bg-black,
          text-white,
          text-5,
          p-x-4,
          p-y-2,
          border-0,
          rounded,
          cursor-pointer
        ) Save Image
    .text-center(v-else) Your ASCII art will be displayed here

  footer.text-center.mt-4.p-b-6
    div All of your images are processed locally in your browser.
    div
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
import { ASCIIArtCanvas } from '#imports'

const inputCanvasRef = ref()
const inputCanvas = useCurrentElement<HTMLCanvasElement>(inputCanvasRef)
const outputCanvasRef = ref()
const outputCanvas = useCurrentElement<HTMLCanvasElement>(outputCanvasRef)

const currentFile = ref<File | null>(null)
const mode = ref('colored')
const size = ref(80)
const { width: windowWidth } = useWindowSize()
const coloredHtmlChars = ref('@')
const fontSize = computed(() =>
  Math.floor((windowWidth.value * 0.9) / size.value)
)
const artHTML = ref('')
const timeSpentMsg = ref('')

let art: ASCIIArtCanvas | null = null

onMounted(async () => {
  if (!globalThis.window) return

  await nextTick()
  console.info(inputCanvas.value)
  art = new ASCIIArtCanvas(inputCanvas.value)

  if (import.meta.dev && !!window) {
    ;(<any>window).art = art
  }

  // draw "click to upload" text
  art.ctx.fillStyle = '#888'
  art.ctx.font =
    '28pt -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  art.ctx.textAlign = 'center'
  art.ctx.fillText('Click to change image', art.width / 2, art.height / 2)

  // draw "your artwork will be here" text
  const out = outputCanvas.value!
  const outCtx = out.getContext('2d')!
  outCtx.fillStyle = '#888'
  outCtx.font =
    '24pt -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  outCtx.textAlign = 'center'
  outCtx.fillText(
    'Your ASCII art will be displayed here',
    out.width / 2,
    out.height / 2
  )

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

  const transformTime = performance.now() - start

  switch (mode.value) {
    case 'colored':
      artHTML.value = art.generateColoredHTML({
        size: size.value,
        chars: coloredHtmlChars.value
          ? coloredHtmlChars.value.split('')
          : undefined,
      })
      art.renderColoredCanvas({
        canvas: outputCanvas.value,
        size: size.value,
        chars: coloredHtmlChars.value
          ? coloredHtmlChars.value.split('')
          : undefined,
      })
      break
    case 'grayscale':
      artHTML.value = art.generateGrayscaleHTML({ size: size.value })
      art.renderGrayscaleCanvas({
        canvas: outputCanvas.value,
        size: size.value,
      })
      break
  }

  const end = performance.now()
  const drawTime = end - start - transformTime
  const totalTime = end - start

  timeSpentMsg.value = `transform: ${transformTime.toFixed(2)}ms + DOM draw: ${drawTime.toFixed(2)}ms = total: ${totalTime.toFixed(2)}`

  console.info('Artwork generated:', `${art.width}x${art.height}`, {
    transformTime,
    drawTime,
    totalTime,
  })
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
watchDebounced(
  coloredHtmlChars,
  (val) => {
    coloredHtmlChars.value = val.replace(/\s/g, '')
    drawArt()
  },
  { debounce: 500 }
)

const copyBtnMsg = refAutoReset('Copy codes', 2000)
function copyToClipboard() {
  if (!artHTML.value) return
  navigator.clipboard
    .writeText(artHTML.value)
    .then(() => {
      copyBtnMsg.value = 'Codes copied!'
    })
    .catch(() => {
      copyBtnMsg.value = 'Something went wrong!'
    })
}
function saveOutputImage() {
  if (!outputCanvas.value) return
  outputCanvas.value.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascii-art_${mode.value}_${size.value}_${currentFile.value?.name?.split('.')[0] || 'artwork'}.png`
    a.click()
    URL.revokeObjectURL(url)
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
  display: block
  margin: 0 auto

.ascii-art
  font-family: "JetBrains Mono",Consolas,Monaco,"Andale Mono","Ubuntu Mono",monospace !important
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
  &.disabled
    opacity: 0.5
    pointer-events: none
</style>
