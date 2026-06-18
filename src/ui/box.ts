/**
 * Box / panel primitives for the dashboard. Renders titled panels with rounded
 * borders and composes them side-by-side into rows. All width math goes through
 * the ANSI-aware helpers so styled content stays aligned.
 */

import { PALETTE } from './theme'
import { bold, dim, fg, padEndVisible, truncateVisible, visibleWidth } from './ansi'
import type { Caps } from './capabilities'

export interface Panel {
  title: string
  /** Pre-styled content lines (each ideally <= inner width; truncated if not). */
  lines: string[]
  /** Minimum total panel width (including borders). */
  minWidth?: number
}

/**
 * Render a single titled panel to an array of lines, each exactly `width`
 * visible columns wide.
 *
 *   ╭─ QUICK START ───────────╮
 *   │ content                 │
 *   ╰─────────────────────────╯
 */
export function renderPanel(panel: Panel, width: number, caps: Caps): string[] {
  const g = caps.glyphs
  const inner = width - 2 // space between the two vertical borders (incl. 1 pad each side handled below)
  const contentWidth = inner - 2 // 1 space padding on each inside edge

  const border = (s: string) => fg(PALETTE.clay, caps, s)

  // Top border with embedded title: ╭─ TITLE ──…──╮
  const title = bold(caps, fg(PALETTE.sandstone, caps, panel.title))
  const titleW = visibleWidth(panel.title)
  const dashesAfter = Math.max(0, inner - titleW - 4) // 4 = "─ " + " " + leading dash
  const top =
    border(g.tl + g.h + ' ') +
    title +
    border(' ' + g.h.repeat(dashesAfter) + g.tr)

  const bottom = border(g.bl + g.h.repeat(inner) + g.br)

  const body = panel.lines.map((line) => {
    const clipped = truncateVisible(line, contentWidth)
    const padded = padEndVisible(clipped, contentWidth)
    return border(g.v) + ' ' + padded + ' ' + border(g.v)
  })

  return [top, ...body, bottom]
}

/**
 * Place several rendered blocks (each an array of equal-width lines) side by
 * side, separated by `gap` spaces. Shorter blocks are padded with blank lines
 * so every column aligns to the tallest.
 */
export function renderRow(blocks: string[][], gap = 2): string[] {
  if (blocks.length === 0) return []
  const height = Math.max(...blocks.map((b) => b.length))
  const widths = blocks.map((b) => (b[0] ? visibleWidth(b[0]) : 0))
  const spacer = ' '.repeat(gap)

  const out: string[] = []
  for (let i = 0; i < height; i++) {
    const cells = blocks.map((block, c) => {
      const line = block[i] ?? ''
      return padEndVisible(line, widths[c])
    })
    out.push(cells.join(spacer))
  }
  return out
}

/** A faint full-width horizontal rule. */
export function rule(width: number, caps: Caps): string {
  return dim(caps, fg(PALETTE.muted, caps, caps.glyphs.h.repeat(Math.max(0, width))))
}
