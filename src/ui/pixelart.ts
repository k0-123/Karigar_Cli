/**
 * Pixel-art artisan figure, rendered with the half-block technique: each text
 * cell stacks two vertical pixels — the upper half (▀) takes the foreground
 * color, the lower half takes the background color. A 16×32-pixel indexed
 * bitmap therefore becomes a 16×16-cell image.
 *
 * Requires truecolor + Unicode; callers gate on that and we guard again here,
 * returning an empty block so the dashboard simply gives the space back to the
 * wordmark.
 */

import chalk from 'chalk'
import type { RGB } from './theme'
import type { Caps } from './capabilities'

const UPPER = '▀'
const LOWER = '▄'

/** Indexed palette. `null` = transparent. Keys match characters in the bitmap. */
const PALETTE: Record<string, RGB | null> = {
  '.': null,
  t: { r: 224, g: 168, b: 60 }, // turban (amber)
  j: { r: 154, g: 90, b: 51 }, // turban band (clay)
  s: { r: 214, g: 158, b: 110 }, // skin
  e: { r: 40, g: 30, b: 28 }, // eyes
  b: { r: 55, g: 42, b: 38 }, // beard
  k: { r: 244, g: 232, b: 208 }, // kurta (cream)
  d: { r: 208, g: 188, b: 150 }, // kurta fold/placket
}

// 32 rows × 16 columns. Each char indexes PALETTE; '.' is transparent.
const ARTISAN_BITMAP: string[] = [
  '......tttt......',
  '....tttttttt....',
  '...tttttttttt...',
  '..tttttttttttt..',
  '..tttttttttttt..',
  '..tjjjjjjjjjjt..',
  '...ssssssssss...',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..sseesssseess..',
  '..ssssssssssss..',
  '..ssssssssssss..',
  '..sbbbbbbbbbbs..',
  '..bbbbbbbbbbbb..',
  '...bbbbbbbbbb...',
  '....bbbbbbbb....',
  '.....bbbbbb.....',
  '......ssss......',
  '....kkkkkkkk....',
  '..kkkkkkkkkkkk..',
  '.kkkkkkkkkkkkkk.',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
  'kkkkkkkddkkkkkkk',
]

/** Visible width (in text cells) of the rendered figure. */
export const ARTISAN_WIDTH = ARTISAN_BITMAP[0]?.length ?? 0

function px(row: string | undefined, col: number): RGB | null {
  if (!row) return null
  return PALETTE[row[col] ?? '.'] ?? null
}

/**
 * Render the artisan as an array of text lines (one per two pixel rows).
 * Returns [] when the terminal can't do truecolor half-blocks.
 */
export function renderArtisan(caps: Caps): string[] {
  if (!caps.truecolor || !caps.unicode || !caps.color) return []

  const lines: string[] = []
  for (let y = 0; y < ARTISAN_BITMAP.length; y += 2) {
    const top = ARTISAN_BITMAP[y]
    const bottom = ARTISAN_BITMAP[y + 1]
    let line = ''
    for (let x = 0; x < ARTISAN_WIDTH; x++) {
      const t = px(top, x)
      const b = px(bottom, x)
      if (!t && !b) {
        line += ' '
      } else if (t && !b) {
        line += chalk.rgb(t.r, t.g, t.b)(UPPER)
      } else if (!t && b) {
        line += chalk.rgb(b.r, b.g, b.b)(LOWER)
      } else if (t && b) {
        line += chalk.rgb(t.r, t.g, t.b).bgRgb(b.r, b.g, b.b)(UPPER)
      }
    }
    lines.push(line)
  }
  return lines
}
