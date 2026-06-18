/**
 * Terminal capability detection. Decides how rich the dashboard can be:
 * whether to use color at all, whether 24-bit truecolor is available (needed
 * for the gradient wordmark and pixel-art figure), and whether the terminal
 * can render Unicode box-drawing / half-block / Devanagari glyphs.
 *
 * This is also the one place where the long-standing `ui.color` config flag is
 * finally honored.
 */

import chalk from 'chalk'
import { GLYPHS_ASCII, GLYPHS_UNICODE, type GlyphSet } from './theme'
import type { KarigarConfig } from '../config/types'

export interface Caps {
  isTTY: boolean
  columns: number
  rows: number
  /** Any color at all (chalk level > 0 and not disabled). */
  color: boolean
  /** 24-bit color — gates gradients and pixel art. */
  truecolor: boolean
  /** Unicode box-drawing / half-block / Devanagari support. */
  unicode: boolean
  glyphs: GlyphSet
}

const DEFAULT_COLUMNS = 80
const DEFAULT_ROWS = 24

/**
 * Heuristic for legacy Windows consoles (cmd.exe / old conhost) that lack
 * Unicode + truecolor. Modern hosts set WT_SESSION (Windows Terminal),
 * TERM_PROGRAM (VS Code), or run under a real TERM.
 */
function detectUnicode(): boolean {
  if (process.platform !== 'win32') return true
  return Boolean(
    process.env.WT_SESSION || process.env.TERM_PROGRAM || process.env.TERM,
  )
}

export function detectCaps(cfg: KarigarConfig): Caps {
  const isTTY = Boolean(process.stdout.isTTY)
  const columns = process.stdout.columns || DEFAULT_COLUMNS
  const rows = process.stdout.rows || DEFAULT_ROWS

  // Honor explicit opt-outs: ui.color flag and the NO_COLOR convention.
  const colorDisabled = cfg.ui.color === false || Boolean(process.env.NO_COLOR)

  // chalk.level: 0 none, 1 basic(16), 2 256, 3 truecolor. It already factors in
  // FORCE_COLOR / piped output, so lean on it for the base color decision.
  const color = !colorDisabled && chalk.level > 0

  const colortermTrue = /truecolor|24bit/i.test(process.env.COLORTERM ?? '')
  const truecolor = color && (chalk.level >= 3 || colortermTrue)

  const unicode = detectUnicode()

  return {
    isTTY,
    columns,
    rows,
    color,
    truecolor,
    unicode,
    glyphs: unicode ? GLYPHS_UNICODE : GLYPHS_ASCII,
  }
}
