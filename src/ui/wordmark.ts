/**
 * The KARIGAR wordmark — hand-authored block letters joined programmatically so
 * every row stays the same width, then swept with the artisan gradient
 * (clay → sandstone → amber → cream) left to right. Degrades to a bold plain
 * "KARIGAR" when color/unicode aren't available.
 */

import { GRADIENT_WORDMARK, grad } from './theme'
import { bold, fg, visibleWidth } from './ansi'
import type { Caps } from './capabilities'

const FILL = '█'

// Each letter is 5 rows; all rows within a letter share one width.
const LETTERS: Record<string, string[]> = {
  K: ['██  ██', '██ ██ ', '████  ', '██ ██ ', '██  ██'],
  A: [' ████ ', '██  ██', '██████', '██  ██', '██  ██'],
  R: ['█████ ', '██  ██', '█████ ', '██ ██ ', '██  ██'],
  I: ['████', ' ██ ', ' ██ ', ' ██ ', '████'],
  G: [' █████', '██    ', '██ ███', '██  ██', ' █████'],
}

const WORD = 'KARIGAR'
const ROWS = 5
const GAP = ' ' // one blank column between letters

/** Build the 5 raw (uncolored) wordmark rows. */
function buildRows(): string[] {
  const rows: string[] = []
  for (let r = 0; r < ROWS; r++) {
    const cells = WORD.split('').map((ch) => LETTERS[ch][r])
    rows.push(cells.join(GAP))
  }
  return rows
}

export const KARIGAR_ART: string[] = buildRows()

/** Natural visible width of the block wordmark. */
export const WORDMARK_WIDTH = visibleWidth(KARIGAR_ART[0])

/**
 * Render the wordmark. With truecolor, each column is tinted along the gradient
 * so the whole word fades clay→cream. Without color/unicode, falls back to a
 * bold plain word.
 */
export function renderWordmark(caps: Caps): string[] {
  if (!caps.color || !caps.unicode) {
    return [bold(caps, 'K A R I G A R')]
  }

  const width = KARIGAR_ART[0].length
  const colors = grad(GRADIENT_WORDMARK, width)

  return KARIGAR_ART.map((row) => {
    let out = ''
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      out += ch === FILL ? fg(colors[i], caps, FILL) : ' '
    }
    return out
  })
}
