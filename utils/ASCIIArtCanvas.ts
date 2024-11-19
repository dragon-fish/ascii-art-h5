export class ASCIIArtCanvas {
  readonly DEFAULT_MONOCHROME_CHARS = '@80GCLft1i;:,. '.split('')
  readonly DEFAULT_COLORED_CHARS = '@'.split('')

  constructor(readonly canvas: HTMLCanvasElement) {
    this.canvas ||= document.createElement('canvas')
    if (!(this.canvas instanceof HTMLCanvasElement)) {
      throw new Error('canvas is not HTMLCanvasElement')
    }
  }

  get ctx() {
    const ctx = this.canvas.getContext('2d')!
    Reflect.set(this, 'ctx', ctx)
    return ctx
  }
  get width() {
    return this.canvas.width
  }
  get height() {
    return this.canvas.height
  }
  set width(value: number) {
    this.canvas.width = value
  }
  set height(value: number) {
    this.canvas.height = value
  }
  get drawImage() {
    return this.ctx.drawImage.bind(this.ctx)
  }

  resize(width: number, height?: number) {
    this.width = width || this.width
    this.height = height || width
    return this
  }

  mount(container: Element) {
    container?.appendChild?.(this.canvas)
    return this
  }
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    return this
  }
  destroy() {
    this.canvas.remove()
    return this
  }

  /**
   * calculate the luminance of a pixel (W3C standard)
   */
  calculateLuminance({ r, g, b }: Pick<ASCIIArtSampledData, 'r' | 'g' | 'b'>) {
    const normalize = (value: number) => value / 255
    const normalizedR = normalize(r)
    const normalizedG = normalize(g)
    const normalizedB = normalize(b)
    const luminance =
      0.2126 * normalizedR + 0.7152 * normalizedG + 0.0722 * normalizedB
    return luminance
  }
  getSampledMap(size = 100) {
    const unitPixel = Math.floor(Math.max(this.width, this.height) / size)
    const rows: ASCIIArtSampledData[][] = []
    for (let y = 0; y < this.height; y += unitPixel) {
      const row = []
      for (let x = 0; x < this.width; x += unitPixel) {
        if (x + unitPixel > this.width || y + unitPixel > this.height) {
          break
        }
        const { data } = this.ctx.getImageData(x, y, unitPixel, unitPixel, {
          colorSpace: 'srgb',
        })
        const [r, g, b, a] = data
          .reduce(
            (acc, cur, index) => {
              acc[index % 4] += cur
              return acc
            },
            [0, 0, 0, 0]
          )
          .map((v) => Math.floor(v / (unitPixel * unitPixel)))
        row.push({
          r,
          g,
          b,
          a,
          luminance: this.calculateLuminance({ r, g, b }),
        })
      }
      rows.push(row)
    }
    return rows
  }

  makeHTMLContainer(width: number, height: number) {
    const container = document.createElement('div')
    container.className = 'ascii-art-container'
    container.style.display = 'grid'
    container.style.gridTemplateColumns = `repeat(${width}, 1fr)`
    container.style.setProperty('--char-width', `${width}`)
    container.style.setProperty('--char-height', `${height}`)
    return container
  }

  /**
   * render the canvas to colored HTML
   * each pixel will be rendered as a colored char
   *
   * @param size the max length of the row
   * @param chars the chars to be used to render the canvas
   * @returns the HTML string
   */
  toColoredHTML(size = 100, chars = this.DEFAULT_COLORED_CHARS) {
    const charMap = this.getSampledMap(size)
    let i = 0
    const html = charMap
      .map((row) => {
        return row
          .map((bit) => {
            const { r, g, b, a } = bit
            const charIndex = i % chars.length
            const char = chars[charIndex]
            i++
            return `<span style="color: rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)});">${char}</span>`
          })
          .join('')
      })
      .join('')
    const container = this.makeHTMLContainer(charMap[0].length, charMap.length)
    container.innerHTML = html
    return container.outerHTML
  }

  /**
   * render the canvas to monochrome HTML
   * each pixel will be calculated to a brightness value
   * the brightness value will be used to select a char from the chars array
   * @param size the max length of the row
   * @param chars the chars to be used to render the canvas
   */
  toGrayscaleHTML(size = 100, chars = this.DEFAULT_MONOCHROME_CHARS) {
    const charMap = this.getSampledMap(size)
    const html = charMap
      .map((row) => {
        return row
          .map((bit) => {
            const charIndex = Math.round(bit.luminance * (chars.length - 1))
            const char = chars[charIndex]
            if (
              charIndex > chars.length ||
              charIndex < 0 ||
              typeof char !== 'string' ||
              char.length !== 1
            ) {
              console.warn('invalid charIndex', {
                charIndex,
                charsLength: chars.length,
                luminance: bit.luminance,
              })
            }
            return `<span>${char}</span>`
          })
          .join('')
      })
      .join('')
    const container = this.makeHTMLContainer(charMap[0].length, charMap.length)
    container.innerHTML = html
    return container.outerHTML
  }
}

/**
 * the sampled data of a pixel
 * @property r red value (0-255)
 * @property g green value (0-255)
 * @property b blue value (0-255)
 * @property a alpha value (0-255)
 * @property luminance luminance value (0-1)
 */
export interface ASCIIArtSampledData {
  r: number
  g: number
  b: number
  a: number
  luminance: number
}