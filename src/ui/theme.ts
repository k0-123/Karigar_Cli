/**
 * Karigar visual theme — the single source of truth for the "artisan" identity:
 * a warm sandstone/amber palette, the wordmark gradient, glyphs (with ASCII
 * fallbacks for legacy terminals), and the bilingual phrase set.
 *
 * Colors are stored as raw RGB so we can interpolate gradients and let chalk
 * downsample to 256/16-color terminals automatically.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

const rgb = (r: number, g: number, b: number): RGB => ({ r, g, b })

/** Core artisan palette — sandstone, amber, cream, clay, plus semantic accents. */
export const PALETTE = {
  sandstone: rgb(200, 138, 74), // #C88A4A — primary brand
  amber: rgb(224, 168, 60), // #E0A83C — highlights
  cream: rgb(244, 232, 208), // #F4E8D0 — text on dark
  clay: rgb(154, 90, 51), // #9A5A33 — deep accent / borders
  sage: rgb(122, 138, 92), // #7A8A5C — muted secondary
  muted: rgb(150, 134, 110), // dim parchment text
  saffron: rgb(255, 153, 51), // 🇮🇳 flag saffron
  green: rgb(19, 136, 8), // 🇮🇳 flag green
  ok: rgb(106, 168, 79),
  warn: rgb(224, 168, 60),
  err: rgb(192, 80, 64),
} as const

/** Left→right gradient stops for the KARIGAR wordmark (clay → amber → cream). */
export const GRADIENT_WORDMARK: RGB[] = [
  PALETTE.clay,
  PALETTE.sandstone,
  PALETTE.amber,
  PALETTE.cream,
]

/**
 * Sample `n` evenly-spaced colors along a piecewise-linear gradient through
 * `stops`. Returns `n` RGB values (n >= 1). Used to color the wordmark per
 * column and progress bars.
 */
export function grad(stops: RGB[], n: number): RGB[] {
  if (n <= 0) return []
  if (stops.length === 0) return Array.from({ length: n }, () => PALETTE.cream)
  if (stops.length === 1 || n === 1) return Array.from({ length: n }, () => stops[0])

  const out: RGB[] = []
  const segments = stops.length - 1
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * segments
    const idx = Math.min(Math.floor(t), segments - 1)
    const frac = t - idx
    const a = stops[idx]
    const b = stops[idx + 1]
    out.push({
      r: Math.round(a.r + (b.r - a.r) * frac),
      g: Math.round(a.g + (b.g - a.g) * frac),
      b: Math.round(a.b + (b.b - a.b) * frac),
    })
  }
  return out
}

/**
 * Glyphs used across the dashboard. Each has a Unicode form and an ASCII
 * fallback for legacy terminals (selected via `caps.unicode`).
 */
export interface GlyphSet {
  hex: string // brand bullet (⬡)
  branch: string // git branch (⎇)
  dot: string // status bullet (●)
  ring: string // empty status bullet (○)
  heart: string
  flag: string
  sep: string // chip separator (·)
  arrow: string // prompt arrow (›)
  barFull: string
  barEmpty: string
  // Box drawing
  tl: string
  tr: string
  bl: string
  br: string
  h: string
  v: string
}

export const GLYPHS_UNICODE: GlyphSet = {
  hex: '⬡',
  branch: '⎇',
  dot: '●',
  ring: '○',
  heart: '❤',
  flag: '🇮🇳',
  sep: '·',
  arrow: '›',
  barFull: '█',
  barEmpty: '░',
  tl: '╭',
  tr: '╮',
  bl: '╰',
  br: '╯',
  h: '─',
  v: '│',
}

export const GLYPHS_ASCII: GlyphSet = {
  hex: '#',
  branch: 'git:',
  dot: '*',
  ring: 'o',
  heart: '<3',
  flag: 'IN',
  sep: '|',
  arrow: '>',
  barFull: '#',
  barEmpty: '-',
  tl: '+',
  tr: '+',
  bl: '+',
  br: '+',
  h: '-',
  v: '|',
}

/** Bilingual phrase set — English-first with small Devanagari accents. */
export const PHRASES = {
  tagline: 'The Open-Source Coding Artisan',
  devanagari: 'कारीगर — कोडिंग को बनाओ आसान',
  /** ASCII transliteration shown when the terminal can't render Devanagari. */
  devanagariAscii: 'Kaarigar — code ko banao aasaan',
  chips: ['Indian', 'Open Source', 'Offline First', 'Yours'],
  footer: 'Crafted with',
  footerTail: 'in India',
  craftingSpinner: 'गढ़ रहे हैं… (crafting)',
  craftingSpinnerAscii: 'Crafting…',
} as const
