/**
 * Karigar hero art — the signature visual of the project.
 *
 * A muscular Indian craftsman (kaarigar) in a dhoti stands before an ornate
 * mandir with a shikhara spire and saffron flag, under a volumetric dawn sky.
 * Rendered entirely with Unicode block characters + 24-bit TrueColor ANSI
 * escapes into a 35-column × 40-row canvas (the right half of an 80×40 split).
 *
 * Self-contained: the only import is `chalk` (already a dependency) and that is
 * used solely to force TrueColor output. All color is emitted as raw escape
 * strings for performance.
 *
 * Preview standalone with the project's runner:
 *     npx tsx src/art/hero.ts
 */

import chalk from 'chalk'
import { fileURLToPath } from 'node:url'

// Force 24-bit color so the gradients render on capable terminals.
chalk.level = 3

/* ------------------------------------------------------------------ types -- */

type RGB = [number, number, number]

interface Pixel {
  char: string
  fg?: RGB
  bg?: RGB
}

type Canvas = Pixel[][]

const COLS = 35
const ROWS = 40

/* --------------------------------------------------------------- palette --- */

const SKY_TOP: RGB = [26, 58, 92]
const SKY_MID: RGB = [45, 106, 159]
const SKY_LOW: RGB = [91, 141, 184]
const SKY_HORIZON: RGB = [200, 168, 130]
const GROUND_TOP: RGB = [200, 168, 130]
const GROUND_LOW: RGB = [150, 120, 85]

const CLOUD_TOP: RGB = [255, 255, 255]
const CLOUD_MID: RGB = [245, 240, 232]
const CLOUD_LOW: RGB = [184, 196, 204]

const STONE_SHADOW: RGB = [110, 95, 72]
// Cream Nagara-temple stone (lighter, like the reference mandir).
const TEMPLE_LIT: RGB = [238, 230, 212]
const TEMPLE_MID: RGB = [212, 198, 170]
const TEMPLE_SHADOW: RGB = [176, 158, 126]
const GOLD: RGB = [212, 175, 55]
const SAFFRON: RGB = [232, 131, 42]
// Saffron angavastram (shoulder shawl) — separates skin zones cleanly.
const SHAWL: RGB = [228, 126, 40]
const SHAWL_HI: RGB = [245, 158, 74]
const SHAWL_SHADOW: RGB = [188, 96, 28]

const SKIN: RGB = [188, 130, 78]
const SKIN_HI: RGB = [214, 158, 104] // lit highlight (left-lit)
const SKIN_MID: RGB = [170, 112, 64]
const SKIN_DARK: RGB = [138, 86, 46] // muscle shadow
const HAIR: RGB = [46, 28, 14]
const HAIR_HI: RGB = [86, 54, 28]
const DHOTI: RGB = [245, 240, 225]
const EYE: RGB = [30, 18, 10]
const SHADOW: RGB = [20, 15, 10]
const BACKDROP: RGB = [150, 116, 78] // warm halo behind the figure

/* ------------------------------------------------------------ primitives -- */

function createCanvas(cols: number, rows: number): Canvas {
  const canvas: Canvas = []
  for (let y = 0; y < rows; y++) {
    const row: Pixel[] = []
    for (let x = 0; x < cols; x++) row.push({ char: ' ' })
    canvas.push(row)
  }
  return canvas
}

function setPixel(canvas: Canvas, col: number, row: number, pixel: Pixel): void {
  if (row < 0 || row >= canvas.length) return
  if (col < 0 || col >= canvas[0].length) return
  canvas[row][col] = pixel
}

function drawRect(
  canvas: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  pixel: Pixel,
): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(canvas, x + dx, y + dy, { ...pixel })
    }
  }
}

function drawLine(
  canvas: Canvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pixel: Pixel,
): void {
  // Integer Bresenham.
  let dx = Math.abs(x2 - x1)
  let dy = -Math.abs(y2 - y1)
  const sx = x1 < x2 ? 1 : -1
  const sy = y1 < y2 ? 1 : -1
  let err = dx + dy
  let x = x1
  let y = y1
  while (true) {
    setPixel(canvas, x, y, { ...pixel })
    if (x === x2 && y === y2) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

/**
 * Stamp a string at (x, y). Spaces are treated as transparent (skipped) when
 * `transparent` is true — this is what gives block art its rounded edges.
 */
function text(
  canvas: Canvas,
  x: number,
  y: number,
  str: string,
  fg?: RGB,
  bg?: RGB,
  transparent = true,
): void {
  const chars = [...str]
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (transparent && ch === ' ') continue
    setPixel(canvas, x + i, y, { char: ch, fg, bg })
  }
}

/** Stamp a string centered horizontally on `cx`. */
function textCentered(
  canvas: Canvas,
  cx: number,
  y: number,
  str: string,
  fg?: RGB,
  bg?: RGB,
  transparent = true,
): void {
  const len = [...str].length
  text(canvas, cx - Math.floor(len / 2), y, str, fg, bg, transparent)
}

/* ----------------------------------------------------------------- color -- */

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

/** Sample a multi-stop gradient. `stops` are [position 0..1, color]. */
function multiStop(stops: Array<[number, RGB]>, t: number): RGB {
  if (t <= stops[0][0]) return stops[0][1]
  if (t >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i]
    const [p1, c1] = stops[i + 1]
    if (t >= p0 && t <= p1) {
      const local = (t - p0) / (p1 - p0)
      return lerpRGB(c0, c1, local)
    }
  }
  return stops[stops.length - 1][1]
}

/* ----------------------------------------------------------------- layers -- */

const SKY_BOTTOM = 14 // rows 0..13 are sky

function drawSky(canvas: Canvas): void {
  const skyStops: Array<[number, RGB]> = [
    [0, SKY_TOP],
    [0.45, SKY_MID],
    [0.75, SKY_LOW],
    [1, SKY_HORIZON],
  ]
  for (let y = 0; y < SKY_BOTTOM; y++) {
    const t = y / (SKY_BOTTOM - 1)
    const c = multiStop(skyStops, t)
    drawRect(canvas, 0, y, COLS, 1, { char: ' ', bg: c })
  }

  // Ground / hazy lower atmosphere.
  for (let y = SKY_BOTTOM; y < ROWS; y++) {
    const t = (y - SKY_BOTTOM) / (ROWS - SKY_BOTTOM - 1)
    const c = multiStop([[0, GROUND_TOP], [1, GROUND_LOW]], t)
    drawRect(canvas, 0, y, COLS, 1, { char: ' ', bg: c })
  }

  // Birds — minimal carets scattered high in the sky.
  const birds: Array<[number, number]> = [
    [6, 3],
    [9, 2],
    [12, 4],
    [21, 3],
    [27, 5],
    [30, 2],
  ]
  for (const [bx, by] of birds) {
    const bg = multiStop(skyStops, by / (SKY_BOTTOM - 1))
    text(canvas, bx, by, '˄', [235, 238, 242], bg)
  }
}

/** One puffy cloud mass anchored at its top-left. */
function cloud(canvas: Canvas, x: number, y: number, scale: 'lg' | 'md' | 'sm'): void {
  const skyBg = (row: number): RGB =>
    multiStop(
      [[0, SKY_TOP], [0.45, SKY_MID], [0.75, SKY_LOW], [1, SKY_HORIZON]],
      row / (SKY_BOTTOM - 1),
    )

  if (scale === 'sm') {
    text(canvas, x, y, '▄▄▀▀', CLOUD_TOP, skyBg(y))
    text(canvas, x, y + 1, '▀▀', CLOUD_LOW, skyBg(y + 1))
    return
  }

  const rows =
    scale === 'lg'
      ? [
          '  ▄▄▄▄▄▄▄▄  ',
          ' ▄██████████▄ ',
          '███████████████',
          ' ▀██████████▀ ',
        ]
      : ['  ▄▄▄▄▄▄  ', ' ▄████████▄ ', '▀▀██████▀▀', '']

  rows.forEach((line, i) => {
    const row = y + i
    const bg = skyBg(row)
    const chars = [...line]
    for (let j = 0; j < chars.length; j++) {
      const ch = chars[j]
      if (ch === ' ') continue
      // Body blocks get a solid white bg; edge runes (▄ ▀) blend over the sky.
      if (ch === '█') {
        setPixel(canvas, x + j, row, { char: ' ', bg: i === 0 ? CLOUD_TOP : CLOUD_MID })
      } else {
        const isTop = ch === '▄'
        setPixel(canvas, x + j, row, {
          char: ch,
          fg: isTop ? CLOUD_TOP : CLOUD_LOW,
          bg,
        })
      }
    }
  })
}

function drawClouds(canvas: Canvas): void {
  cloud(canvas, 0, 6, 'lg') // large left
  cloud(canvas, 22, 4, 'md') // medium upper-right
  cloud(canvas, 14, 9, 'sm') // center wisp
  cloud(canvas, 8, 11, 'sm') // low wisp
}

const TEMPLE_CX = 27

function drawTemple(canvas: Canvas): void {
  const cx = TEMPLE_CX

  // Saffron flag on a pole at the very top.
  drawLine(canvas, cx, 5, cx, 9, { char: '│', fg: STONE_SHADOW })
  text(canvas, cx + 1, 5, '◣', SAFFRON, undefined, true)
  text(canvas, cx + 1, 6, '◣', SAFFRON, undefined, true)

  // Kalasha (gold finial) + amalaka disc crowning the spire.
  textCentered(canvas, cx, 9, '♦', GOLD, undefined, true)
  textCentered(canvas, cx, 10, '▟█▙', GOLD, undefined, true)

  // Shikhara (curvilinear Nagara spire): smoothly widening tiers of cream
  // stone with a central rib (lata) and occasional banding courses.
  const tiers: Array<[number, number]> = [
    [11, 3],
    [12, 3],
    [13, 5],
    [14, 5],
    [15, 7],
    [16, 7],
    [17, 9],
    [18, 9],
  ]
  for (const [y, w] of tiers) {
    const x = cx - Math.floor(w / 2)
    drawRect(canvas, x, y, w, 1, { char: ' ', bg: TEMPLE_LIT })
    // Right half in shadow for roundness.
    drawRect(canvas, cx + 1, y, x + w - (cx + 1), 1, { char: ' ', bg: TEMPLE_MID })
    // Central rib down the spire (lata).
    setPixel(canvas, cx, y, { char: ' ', bg: TEMPLE_SHADOW })
  }
  // Banding courses between tier groups (kept within the tier width).
  setPixel(canvas, cx - 2, 14, { char: '─', fg: TEMPLE_SHADOW, bg: TEMPLE_LIT })
  setPixel(canvas, cx + 2, 14, { char: '─', fg: TEMPLE_SHADOW, bg: TEMPLE_MID })
  setPixel(canvas, cx - 3, 16, { char: '─', fg: TEMPLE_SHADOW, bg: TEMPLE_LIT })
  setPixel(canvas, cx + 3, 16, { char: '─', fg: TEMPLE_SHADOW, bg: TEMPLE_MID })

  // Main shrine body (mandapa) — wider cream block.
  const bodyX = cx - 6
  drawRect(canvas, bodyX, 19, 13, 16, { char: ' ', bg: TEMPLE_LIT })
  drawRect(canvas, cx + 1, 19, bodyX + 13 - (cx + 1), 16, { char: ' ', bg: TEMPLE_MID })

  // Cornice + gold frieze under the spire.
  textCentered(canvas, cx, 19, '◆✦◆✦◆✦◆✦◆', GOLD, TEMPLE_LIT, false)
  textCentered(canvas, cx, 20, '═════════════', TEMPLE_SHADOW, TEMPLE_LIT, false)

  // Corner pilasters.
  drawRect(canvas, bodyX, 21, 1, 14, { char: '║', fg: TEMPLE_SHADOW, bg: TEMPLE_MID })
  drawRect(canvas, bodyX + 12, 21, 1, 14, { char: '║', fg: TEMPLE_SHADOW, bg: TEMPLE_MID })

  // Tall arched doorway (torana) with a dark sanctum and a glowing lamp.
  textCentered(canvas, cx, 23, '▟▔▔▔▙', TEMPLE_SHADOW, TEMPLE_LIT, false)
  drawRect(canvas, cx - 2, 24, 5, 10, { char: ' ', bg: SHADOW })
  textCentered(canvas, cx, 30, '◉', GOLD, SHADOW) // diya inside
  textCentered(canvas, cx, 31, '▔', SAFFRON, SHADOW)

  // Flanking niches with small idols suggested by dots.
  setPixel(canvas, bodyX + 2, 26, { char: '◈', fg: GOLD, bg: TEMPLE_MID })
  setPixel(canvas, bodyX + 10, 26, { char: '◈', fg: GOLD, bg: TEMPLE_MID })

  // Plinth + steps (widening tiers).
  drawRect(canvas, cx - 7, 35, 15, 1, { char: ' ', bg: TEMPLE_MID })
  drawRect(canvas, cx - 8, 36, 17, 1, { char: ' ', bg: TEMPLE_SHADOW })
  drawRect(canvas, cx - 8, 37, 17, 1, { char: ' ', bg: TEMPLE_MID })
}

const FIG_CX = 9 // figure centered around column 9

function drawFigure(canvas: Canvas): void {
  // Soft warm radial backdrop so the bust lifts off the temple/sky.
  for (let y = 9; y <= 39; y++) {
    for (let x = FIG_CX - 8; x <= FIG_CX + 8; x++) {
      const cur = canvas[y]?.[x]
      if (!cur || cur.char !== ' ') continue
      const dx = Math.abs(x - FIG_CX) / 8
      const dy = Math.abs(y - 26) / 14
      const d = Math.min(1, Math.hypot(dx, dy))
      cur.bg = cur.bg ? lerpRGB(cur.bg, BACKDROP, 0.6 * (1 - d)) : BACKDROP
    }
  }

  const cx = FIG_CX

  // ── HAIR (rows 9-10) ──────────────────────────────────────────────────
  textCentered(canvas, cx, 9, '▗▄▄▄▄▄▖', HAIR, undefined, true)
  drawRect(canvas, cx - 3, 10, 7, 1, { char: ' ', bg: HAIR })
  setPixel(canvas, cx - 1, 10, { char: ' ', bg: HAIR_HI }) // sheen

  // ── FACE (rows 11-16) — a clean oval, left-lit ────────────────────────
  // Forehead.
  drawRect(canvas, cx - 3, 11, 7, 1, { char: ' ', bg: SKIN })
  drawRect(canvas, cx - 3, 11, 3, 1, { char: ' ', bg: SKIN_HI })
  // Brows + eyes (whites + dark iris for a real gaze).
  drawRect(canvas, cx - 3, 12, 7, 1, { char: ' ', bg: SKIN })
  text(canvas, cx - 2, 12, '▀▀ ▀▀', HAIR, SKIN, true) // eyebrows
  drawRect(canvas, cx - 3, 13, 7, 1, { char: ' ', bg: SKIN })
  setPixel(canvas, cx - 2, 13, { char: '◖', fg: EYE, bg: [248, 244, 238] })
  setPixel(canvas, cx + 2, 13, { char: '◖', fg: EYE, bg: [248, 244, 238] })
  // Nose (centre ridge lit, sides shaded).
  drawRect(canvas, cx - 3, 14, 7, 1, { char: ' ', bg: SKIN })
  setPixel(canvas, cx, 14, { char: ' ', bg: SKIN_HI })
  setPixel(canvas, cx + 1, 14, { char: '▏', fg: SKIN_DARK, bg: SKIN })
  // Handlebar mustache — bold, curling up at both tips (the signature look).
  drawRect(canvas, cx - 3, 15, 7, 1, { char: ' ', bg: SKIN })
  setPixel(canvas, cx - 3, 15, { char: '◞', fg: HAIR, bg: SKIN })
  text(canvas, cx - 2, 15, '▀███▀', HAIR, SKIN, true)
  setPixel(canvas, cx + 3, 15, { char: '◟', fg: HAIR, bg: SKIN })
  // Mouth + chin/short beard.
  drawRect(canvas, cx - 3, 16, 7, 1, { char: ' ', bg: SKIN })
  setPixel(canvas, cx, 16, { char: '▁', fg: [120, 60, 50], bg: SKIN })
  textCentered(canvas, cx, 17, '▝███▘', HAIR, undefined, true) // jaw beard
  setPixel(canvas, cx, 17, { char: ' ', bg: SKIN }) // chin tip lit
  // Ears.
  setPixel(canvas, cx - 4, 13, { char: '◗', fg: SKIN_DARK, bg: SKIN })
  setPixel(canvas, cx + 4, 13, { char: '◖', fg: SKIN_DARK, bg: SKIN })

  // ── NECK (row 18) ─────────────────────────────────────────────────────
  textCentered(canvas, cx, 18, '███', SKIN, SKIN, false)
  setPixel(canvas, cx + 1, 18, { char: ' ', bg: SKIN_MID }) // neck shadow

  // ── SHOULDERS + BARE CHEST (rows 19-26) ───────────────────────────────
  for (let y = 19; y <= 31; y++) {
    const w = y <= 20 ? 13 : 15 // broad shoulders, then full chest
    const x = cx - Math.floor(w / 2)
    drawRect(canvas, x, y, w, 1, { char: ' ', bg: SKIN })
  }
  // Rounded shoulder caps.
  setPixel(canvas, cx - 6, 19, { char: '▟', fg: SKIN, bg: undefined })
  setPixel(canvas, cx + 6, 19, { char: '▙', fg: SKIN, bg: undefined })
  // Left-lit highlight, right-side shadow → 3D muscle.
  drawRect(canvas, cx - 6, 20, 3, 9, { char: ' ', bg: SKIN_HI })
  drawRect(canvas, cx + 4, 20, 4, 10, { char: ' ', bg: SKIN_MID })
  drawRect(canvas, cx + 6, 22, 2, 8, { char: ' ', bg: SKIN_DARK })
  // Collarbone + pectoral separation + pec under-curve.
  text(canvas, cx - 4, 20, '▁▁▁▁▁▁▁▁', SKIN_DARK, SKIN, true)
  drawRect(canvas, cx, 21, 1, 6, { char: '▏', fg: SKIN_DARK, bg: SKIN })
  text(canvas, cx - 4, 24, '◜◝ ◜◝', SKIN_DARK, SKIN, true) // pec lower edge
  // Subtle ab ticks.
  for (let y = 27; y <= 30; y++) {
    setPixel(canvas, cx - 1, y, { char: '▕', fg: SKIN_DARK, bg: SKIN_HI })
    setPixel(canvas, cx + 1, y, { char: '▏', fg: SKIN_DARK, bg: SKIN })
  }

  // ── SAFFRON SHAWL (angavastram) over the LEFT shoulder ────────────────
  // Drapes from the shoulder diagonally across the body — this is what keeps
  // skin tones from bleeding into each other, and adds the saffron accent.
  for (let y = 19; y <= 31; y++) {
    const x = cx + 3 + Math.floor((y - 19) / 3)
    drawRect(canvas, x, y, cx + 7 - x, 1, { char: ' ', bg: SHAWL })
    setPixel(canvas, x, y, { char: '▙', fg: SHAWL_HI, bg: SKIN }) // lit fold edge
    setPixel(canvas, cx + 7, y, { char: ' ', bg: SHAWL_SHADOW })
  }
  // A few drape folds.
  for (let y = 21; y <= 30; y += 2) {
    setPixel(canvas, cx + 5, y, { char: '▏', fg: SHAWL_SHADOW, bg: SHAWL })
  }

  // ── JEWELLERY & THREADS ───────────────────────────────────────────────
  // Sacred thread (yagnopavita) across the bare right side of the chest.
  drawLine(canvas, cx + 3, 19, cx - 4, 30, { char: '╲', fg: DHOTI, bg: SKIN })
  // Gold necklace at the collar.
  text(canvas, cx - 2, 19, '◦◦◦', GOLD, SKIN, true)
  setPixel(canvas, cx, 20, { char: '♦', fg: GOLD, bg: SKIN }) // pendant

  // ── CROP FADE (rows 32-39) — fade the bust into the backdrop ──────────
  for (let y = 32; y <= 39; y++) {
    const t = (y - 31) / 8
    for (let x = cx - 8; x <= cx + 8; x++) {
      const px = canvas[y]?.[x]
      if (!px) continue
      const base = px.bg ?? BACKDROP
      px.char = ' '
      px.fg = undefined
      px.bg = lerpRGB(base, BACKDROP, Math.min(1, t))
    }
  }
}

function drawAtmosphere(canvas: Canvas): void {
  // Hazy horizon band (rows 20-25): blend existing background toward warm cream.
  for (let y = 20; y <= 25; y++) {
    const amount = 0.18 * (1 - Math.abs(22.5 - y) / 3)
    for (let x = 0; x < COLS; x++) {
      const px = canvas[y][x]
      if (px.char === ' ' && px.bg) {
        px.bg = lerpRGB(px.bg, SKY_HORIZON, Math.max(0, amount))
      }
    }
  }
}

/* ---------------------------------------------------------------- render --- */

function renderCanvas(canvas: Canvas): string {
  const lines: string[] = []
  for (const row of canvas) {
    let line = ''
    for (const px of row) {
      let s = ''
      if (px.fg) s += `\x1b[38;2;${px.fg[0]};${px.fg[1]};${px.fg[2]}m`
      if (px.bg) s += `\x1b[48;2;${px.bg[0]};${px.bg[1]};${px.bg[2]}m`
      s += px.char
      line += s
    }
    line += '\x1b[0m'
    lines.push(line)
  }
  return lines.join('\n')
}

/** Build the 35×40 hero art and return it as a single ANSI string. */
export function renderKarigarHero(): string {
  const canvas = createCanvas(COLS, ROWS)
  drawSky(canvas)
  drawClouds(canvas)
  drawTemple(canvas)
  drawAtmosphere(canvas)
  drawFigure(canvas) // figure drawn last so it sits in front
  return renderCanvas(canvas)
}

/** Return the hero art as an array of rows (handy for split-canvas layouts). */
export function renderKarigarHeroLines(): string[] {
  return renderKarigarHero().split('\n')
}

/**
 * Print the hero at a fixed screen position, one line at a time, using cursor
 * positioning so it can be overlaid beside left-side text panels.
 */
export function printHeroAt(startCol: number, startRow: number): void {
  const lines = renderKarigarHeroLines()
  let out = ''
  lines.forEach((line, i) => {
    out += `\x1b[${startRow + i};${startCol}H${line}`
  })
  process.stdout.write(out)
}

/* ------------------------------------------------------------ standalone -- */

// ESM-equivalent of `require.main === module`: true only when run directly.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write('\n' + renderKarigarHero() + '\n')
}
