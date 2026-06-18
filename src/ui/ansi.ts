/**
 * ANSI-aware string width and padding. The dashboard's column grid only aligns
 * if we measure the *visible* width of styled strings correctly — accounting
 * for ANSI escape codes (zero width), zero-width combining marks (Devanagari
 * matras), and wide East-Asian / emoji glyphs (two columns).
 *
 * Replaces the brittle `/\[[0-9;]*m/g`-based padding in the old banner.
 */

import chalk from 'chalk'
import type { RGB } from './theme'
import type { Caps } from './capabilities'

// Matches CSI SGR sequences like \x1b[31m, \x1b[0m, \x1b[38;2;r;g;bm.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '')
}

/** True for Unicode combining marks that occupy zero terminal columns. */
function isZeroWidth(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) || // combining diacritical marks
    (cp >= 0x0900 && cp <= 0x0903) || // Devanagari signs (anusvara etc.)
    (cp >= 0x093a && cp <= 0x094f) || // Devanagari vowel signs / virama
    (cp >= 0x0951 && cp <= 0x0957) || // Devanagari stress/accent marks
    (cp >= 0x0962 && cp <= 0x0963) ||
    cp === 0x200d || // zero-width joiner
    cp === 0xfe0f // variation selector-16 (emoji presentation)
  )
}

/** True for glyphs that occupy two terminal columns. */
function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals / Kangxi
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana .. CJK symbols
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK unified
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK compat
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK compat forms
    (cp >= 0xff00 && cp <= 0xff60) || // fullwidth forms
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) || // emoji & pictographs
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK ext B+
  )
}

/** Visible column width of a (possibly styled) string. */
export function visibleWidth(s: string): number {
  const plain = stripAnsi(s)
  let width = 0
  for (const ch of plain) {
    const cp = ch.codePointAt(0) ?? 0
    if (cp === 0) continue
    if (isZeroWidth(cp)) continue
    width += isWide(cp) ? 2 : 1
  }
  return width
}

/** Pad a styled string on the right to `width` visible columns. */
export function padEndVisible(s: string, width: number): string {
  const gap = width - visibleWidth(s)
  return gap > 0 ? s + ' '.repeat(gap) : s
}

/** Pad a styled string on the left to `width` visible columns. */
export function padStartVisible(s: string, width: number): string {
  const gap = width - visibleWidth(s)
  return gap > 0 ? ' '.repeat(gap) + s : s
}

/** Center a styled string within `width` visible columns. */
export function centerVisible(s: string, width: number): string {
  const gap = width - visibleWidth(s)
  if (gap <= 0) return s
  const left = Math.floor(gap / 2)
  return ' '.repeat(left) + s + ' '.repeat(gap - left)
}

/**
 * Truncate a styled string to at most `width` visible columns, appending an
 * ellipsis when it had to cut. Drops ANSI styling (callers re-style the result),
 * which is sufficient for the plain-text panel content we truncate.
 */
export function truncateVisible(s: string, width: number, ellipsis = '…'): string {
  const plain = stripAnsi(s)
  if (visibleWidth(plain) <= width) return plain
  const ellW = visibleWidth(ellipsis)
  let out = ''
  let w = 0
  for (const ch of plain) {
    const cp = ch.codePointAt(0) ?? 0
    const cw = isZeroWidth(cp) ? 0 : isWide(cp) ? 2 : 1
    if (w + cw > width - ellW) break
    out += ch
    w += cw
  }
  return out + ellipsis
}

/** Apply a foreground RGB color, respecting capability (no-op without color). */
export function fg(c: RGB, caps: Caps, s: string): string {
  return caps.color ? chalk.rgb(c.r, c.g, c.b)(s) : s
}

/** Apply a background RGB color, respecting capability. */
export function bg(c: RGB, caps: Caps, s: string): string {
  return caps.color ? chalk.bgRgb(c.r, c.g, c.b)(s) : s
}

/** Bold, respecting capability. */
export function bold(caps: Caps, s: string): string {
  return caps.color ? chalk.bold(s) : s
}

/** Dim, respecting capability. */
export function dim(caps: Caps, s: string): string {
  return caps.color ? chalk.dim(s) : s
}
