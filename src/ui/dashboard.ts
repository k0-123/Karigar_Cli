/**
 * The Karigar dashboard — the artisan home screen shown when `karigar` launches
 * with no subcommand (and via `karigar home`). Chooses a layout tier based on
 * terminal width / capabilities and degrades to a compact banner when needed.
 */

import { VERSION } from '../version'
import { PALETTE, PHRASES } from './theme'
import { detectCaps, type Caps } from './capabilities'
import { bold, dim, fg, padEndVisible, visibleWidth } from './ansi'
import { renderPanel, renderRow, type Panel } from './box'
import { renderWordmark, WORDMARK_WIDTH } from './wordmark'
import { renderArtisan, ARTISAN_WIDTH } from './pixelart'
import { gatherDashboardData, type DashboardData } from './data'
import type { KarigarConfig } from '../config/types'

const MAX_WIDTH = 120
const FULL_MIN = 100
const MEDIUM_MIN = 80
/** SYSTEM STATUS box is kept narrow — its content is short. */
const STATUS_BOX_WIDTH = 44

/** Public entry: render the dashboard as a single string ready to print. */
export function renderDashboard(cfg: KarigarConfig): string {
  const caps = detectCaps(cfg)
  const data = gatherDashboardData(cfg)

  // Opt-outs: compact banner when the user disabled the dashboard, picked the
  // 'plain' theme, or the terminal can't support the full layout.
  const wantsCompact = cfg.ui.dashboard === false || cfg.ui.theme === 'plain'
  if (wantsCompact || !caps.isTTY || caps.columns < MEDIUM_MIN || !caps.color) {
    return renderCompactBanner(caps, data)
  }

  const width = Math.min(caps.columns, MAX_WIDTH)
  const tier = caps.columns >= FULL_MIN ? 'full' : 'medium'
  return renderFull(caps, data, width, tier)
}

/* ------------------------------------------------------------------ header -- */

function headerBar(data: DashboardData, caps: Caps, width: number): string {
  const g = caps.glyphs
  const left =
    fg(PALETTE.amber, caps, g.hex + ' ') +
    bold(caps, fg(PALETTE.cream, caps, 'karigar')) +
    dim(caps, fg(PALETTE.muted, caps, `  ${data.cwdLabel}`)) +
    (data.branch
      ? dim(caps, fg(PALETTE.sage, caps, `  ${g.branch} ${data.branch}`))
      : '')

  const right =
    fg(PALETTE.ok, caps, g.dot) +
    dim(caps, fg(PALETTE.muted, caps, ` ${data.provider} ${g.sep} ${data.model} ${g.sep} v${VERSION}`))

  const gap = width - visibleWidth(left) - visibleWidth(right)
  return gap > 0 ? left + ' '.repeat(gap) + right : left
}

/* -------------------------------------------------------------- identity --- */

function identityBlock(caps: Caps): string[] {
  const lines: string[] = []
  lines.push(
    bold(caps, fg(PALETTE.amber, caps, `v${VERSION}`)) +
      dim(caps, fg(PALETTE.muted, caps, `   ${PHRASES.tagline}`)),
  )
  const deva = caps.unicode ? PHRASES.devanagari : PHRASES.devanagariAscii
  lines.push(fg(PALETTE.sandstone, caps, deva))

  const sep = dim(caps, fg(PALETTE.muted, caps, ` ${caps.glyphs.sep} `))
  const chips = PHRASES.chips
    .map((c) => fg(PALETTE.cream, caps, c))
    .join(sep)
  lines.push(chips)
  return lines
}

/* ----------------------------------------------------------------- panels -- */

function buildPanels(data: DashboardData, caps: Caps): {
  status: Panel
} {
  const kv = (k: string, v: string, accent = PALETTE.cream) =>
    dim(caps, fg(PALETTE.muted, caps, padEndVisible(k, 16))) + fg(accent, caps, v)

  const status: Panel = {
    title: 'SYSTEM STATUS',
    lines: [
      kv('Model Provider', data.provider),
      kv('Model Loaded', data.model),
      kv('Context Engine', 'ready', PALETTE.ok),
      kv('Fleet', data.fleetSummary, data.fleetActive ? PALETTE.ok : PALETTE.muted),
      kv('Branch', data.branch ?? '—', PALETTE.sage),
    ],
  }

  return { status }
}

/* ------------------------------------------------------------------ full --- */

function renderFull(
  caps: Caps,
  data: DashboardData,
  width: number,
  tier: 'full' | 'medium',
): string {
  const out: string[] = []
  out.push('')
  out.push(headerBar(data, caps, width))
  out.push('')

  const { status } = buildPanels(data, caps)
  const useArt =
    tier === 'full' &&
    caps.truecolor &&
    caps.unicode &&
    width >= WORDMARK_WIDTH + ARTISAN_WIDTH + 6

  if (useArt) {
    // LEFT column: wordmark · identity · SYSTEM STATUS.
    // RIGHT column: the artisan pixel-art figure.
    const artGap = 4
    const leftW = width - ARTISAN_WIDTH - artGap
    const left: string[] = []
    left.push(...renderWordmark(caps))
    left.push('')
    left.push(...identityBlock(caps))
    left.push('')
    left.push(...renderPanel(status, Math.min(leftW, STATUS_BOX_WIDTH), caps))

    const art = renderArtisan(caps)
    out.push(...renderRow([padBlock(left, leftW), art], artGap))
  } else {
    // No art: wordmark, identity, then the status panel (kept compact).
    out.push(...renderWordmark(caps))
    out.push('')
    out.push(...identityBlock(caps))
    out.push('')
    out.push(...renderPanel(status, Math.min(width, STATUS_BOX_WIDTH), caps))
  }

  out.push('')
  out.push(hintLine(caps))
  out.push('')
  out.push(footer(caps, width))
  out.push('')
  return out.join('\n')
}

/** A one-line hint pointing at the live prompt below. */
function hintLine(caps: Caps): string {
  return (
    '  ' +
    dim(caps, fg(PALETTE.muted, caps, 'Ask anything below, or type ')) +
    fg(PALETTE.amber, caps, '/') +
    dim(caps, fg(PALETTE.muted, caps, ' for commands'))
  )
}

/** Left-pad a block of lines to a fixed visible width. */
function padBlock(lines: string[], width: number): string[] {
  return lines.map((l) => padEndVisible(l, width))
}

function footer(caps: Caps, width: number): string {
  const g = caps.glyphs
  const left = dim(
    caps,
    fg(PALETTE.muted, caps, `${g.hex} karigar  ${g.arrow} ask, build, fix, refactor…`),
  )
  const right =
    dim(caps, fg(PALETTE.muted, caps, `${PHRASES.footer} `)) +
    fg(PALETTE.err, caps, g.heart) +
    dim(caps, fg(PALETTE.muted, caps, ` ${PHRASES.footerTail} `)) +
    g.flag
  const gap = width - visibleWidth(left) - visibleWidth(right)
  return gap > 0 ? left + ' '.repeat(gap) + right : left
}

/* --------------------------------------------------------------- compact --- */

export function renderCompactBanner(
  caps: Caps,
  data: DashboardData,
): string {
  const g = caps.glyphs
  const lines: string[] = []
  lines.push('')
  lines.push(bold(caps, fg(PALETTE.amber, caps, '  K A R I G A R')) + dim(caps, fg(PALETTE.muted, caps, `  v${VERSION}`)))
  lines.push(dim(caps, fg(PALETTE.muted, caps, '  ' + PHRASES.tagline)))
  const deva = caps.unicode ? PHRASES.devanagari : PHRASES.devanagariAscii
  lines.push(fg(PALETTE.sandstone, caps, '  ' + deva))
  lines.push('')
  const fleetGlyph = data.fleetActive ? fg(PALETTE.ok, caps, g.dot) : fg(PALETTE.warn, caps, g.ring)
  lines.push('  ' + fleetGlyph + dim(caps, fg(PALETTE.muted, caps, `  ${data.provider} ${g.sep} ${data.model}`)))
  lines.push(
    '  ' +
      dim(caps, fg(PALETTE.muted, caps, 'type ')) +
      fg(PALETTE.amber, caps, '/help') +
      dim(caps, fg(PALETTE.muted, caps, ' for commands, ')) +
      fg(PALETTE.amber, caps, '/exit') +
      dim(caps, fg(PALETTE.muted, caps, ' to quit')),
  )
  lines.push('')
  lines.push(
    '  ' +
      dim(caps, fg(PALETTE.muted, caps, `${PHRASES.footer} `)) +
      fg(PALETTE.err, caps, g.heart) +
      dim(caps, fg(PALETTE.muted, caps, ` ${PHRASES.footerTail} `)) +
      g.flag,
  )
  return lines.join('\n')
}
