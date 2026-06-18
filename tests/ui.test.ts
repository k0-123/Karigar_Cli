import { describe, it, expect } from 'vitest'
import { visibleWidth, stripAnsi, padEndVisible, truncateVisible, centerVisible } from '../src/ui/ansi'
import { grad, PALETTE } from '../src/ui/theme'
import { detectCaps } from '../src/ui/capabilities'
import { renderDashboard } from '../src/ui/dashboard'
import { relativeTime } from '../src/repl/sessionStore'
import { defaultConfig } from '../src/config/defaults'
import type { KarigarConfig } from '../src/config/types'

describe('ansi width math', () => {
  it('ignores ANSI escape codes when measuring width', () => {
    const styled = '\x1b[38;2;200;138;74mhello\x1b[39m'
    expect(stripAnsi(styled)).toBe('hello')
    expect(visibleWidth(styled)).toBe(5)
  })

  it('counts Devanagari combining marks as zero width', () => {
    // कारीगर has combining matras that must not add columns.
    const word = 'कारीगर'
    // 6 base consonants/vowels, the matras (ा ी) are zero-width.
    expect(visibleWidth(word)).toBeLessThan(word.length)
  })

  it('counts emoji as two columns', () => {
    expect(visibleWidth('🇮🇳')).toBeGreaterThanOrEqual(2)
  })

  it('pads to an exact visible width regardless of styling', () => {
    const styled = '\x1b[1mhi\x1b[22m'
    expect(visibleWidth(padEndVisible(styled, 10))).toBe(10)
  })

  it('truncates with an ellipsis when over width', () => {
    expect(truncateVisible('abcdefghij', 5)).toBe('abcd…')
    expect(truncateVisible('abc', 5)).toBe('abc')
  })

  it('centers within a width', () => {
    expect(visibleWidth(centerVisible('hi', 8))).toBe(8)
  })
})

describe('gradient sampler', () => {
  it('returns exactly n colors', () => {
    expect(grad([PALETTE.clay, PALETTE.cream], 10)).toHaveLength(10)
  })

  it('endpoints match the stops', () => {
    const colors = grad([PALETTE.clay, PALETTE.cream], 5)
    expect(colors[0]).toEqual(PALETTE.clay)
    expect(colors[colors.length - 1]).toEqual(PALETTE.cream)
  })

  it('handles single-stop and zero-length requests', () => {
    expect(grad([PALETTE.amber], 3)).toEqual([PALETTE.amber, PALETTE.amber, PALETTE.amber])
    expect(grad([], 0)).toEqual([])
  })
})

describe('capability detection', () => {
  it('honors ui.color = false', () => {
    const cfg: KarigarConfig = { ...defaultConfig, ui: { ...defaultConfig.ui, color: false } }
    expect(detectCaps(cfg).color).toBe(false)
  })

  it('honors NO_COLOR', () => {
    const prev = process.env.NO_COLOR
    process.env.NO_COLOR = '1'
    try {
      expect(detectCaps(defaultConfig).color).toBe(false)
    } finally {
      if (prev === undefined) delete process.env.NO_COLOR
      else process.env.NO_COLOR = prev
    }
  })
})

describe('dashboard rendering', () => {
  it('produces a compact, ANSI-free banner when color is disabled', () => {
    const cfg: KarigarConfig = { ...defaultConfig, ui: { ...defaultConfig.ui, color: false } }
    const out = renderDashboard(cfg)
    expect(out).toContain('K A R I G A R')
    expect(out).toContain('Crafted with')
    // No raw escape codes leak into piped/no-color output.
    expect(out).not.toMatch(/\x1b\[/)
  })

  it('falls back to compact when ui.dashboard is false', () => {
    const cfg: KarigarConfig = {
      ...defaultConfig,
      ui: { ...defaultConfig.ui, color: false, dashboard: false },
    }
    const out = renderDashboard(cfg)
    // Compact banner has the help hint line; full dashboard does not.
    expect(out).toContain('/help')
  })
})

describe('relativeTime', () => {
  const base = new Date('2026-06-15T14:00:00').getTime()
  it('formats today / yesterday / N days ago', () => {
    expect(relativeTime(base, base)).toMatch(/^today/)
    expect(relativeTime(base - 86_400_000, base)).toMatch(/^yesterday/)
    expect(relativeTime(base - 3 * 86_400_000, base)).toMatch(/d ago$/)
  })
})
