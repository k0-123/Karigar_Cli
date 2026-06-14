import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseDirectives, stripDirectives } from '../src/context/directives'
import { readFile, readDir } from '../src/context/files'
import { buildContext } from '../src/context/assemble'
import { defaultConfig } from '../src/config/defaults'

let tmp: string
let originalCwd: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'karigar-ctx-'))
  originalCwd = process.cwd()
  process.chdir(tmp)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(tmp, { recursive: true, force: true })
  vi.restoreAllMocks()
  delete process.env.KARIGAR_HOME
  delete process.env.KARIGAR_SELECTION
})

// ── directive parser ─────────────────────────────────────────────────────────

describe('parseDirectives', () => {
  it('parses @file with a path', () => {
    const d = parseDirectives('fix this @file src/app.ts please')
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({ kind: 'file', arg: 'src/app.ts' })
  })

  it('parses @diff with no arg', () => {
    const d = parseDirectives('review @diff')
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({ kind: 'diff', arg: undefined })
  })

  it('parses multiple directives', () => {
    const d = parseDirectives('@file a.ts and @diff and @selection')
    expect(d).toHaveLength(3)
    expect(d.map(x => x.kind)).toEqual(['file', 'diff', 'selection'])
  })

  it('returns empty array when no directives', () => {
    expect(parseDirectives('just a plain question')).toHaveLength(0)
  })
})

describe('stripDirectives', () => {
  it('removes directives and cleans whitespace', () => {
    expect(stripDirectives('explain @file src/cli.ts please')).toBe('explain please')
    expect(stripDirectives('@diff')).toBe('')
  })
})

// ── file reader ──────────────────────────────────────────────────────────────

describe('readFile', () => {
  it('reads a text file and returns relative path', () => {
    writeFileSync(join(tmp, 'hello.ts'), 'export const x = 1')
    const result = readFile(join(tmp, 'hello.ts'))
    expect(result).not.toBeNull()
    expect(result!.content).toContain('export const x')
    expect(result!.truncated).toBe(false)
  })

  it('returns null for binary extensions', () => {
    writeFileSync(join(tmp, 'image.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    expect(readFile(join(tmp, 'image.png'))).toBeNull()
  })

  it('returns null for non-existent file', () => {
    expect(readFile(join(tmp, 'ghost.ts'))).toBeNull()
  })
})

describe('readDir', () => {
  it('reads files up to maxFiles limit', () => {
    writeFileSync(join(tmp, 'a.ts'), 'a')
    writeFileSync(join(tmp, 'b.ts'), 'b')
    writeFileSync(join(tmp, 'c.ts'), 'c')
    const { included } = readDir(tmp, 2)
    expect(included).toHaveLength(2)
  })

  it('skips node_modules and dist', () => {
    mkdirSync(join(tmp, 'node_modules'))
    writeFileSync(join(tmp, 'node_modules', 'pkg.ts'), 'x')
    writeFileSync(join(tmp, 'real.ts'), 'y')
    const { included } = readDir(tmp, 10)
    expect(included.every(f => !f.path.includes('node_modules'))).toBe(true)
  })
})

// ── assemble ─────────────────────────────────────────────────────────────────

describe('buildContext', () => {
  it('injects @file content into systemContext', () => {
    writeFileSync(join(tmp, 'app.ts'), 'const hello = "world"')
    const { systemContext, cleanPrompt, warnings } = buildContext(
      `explain @file ${join(tmp, 'app.ts')}`,
      defaultConfig,
    )
    expect(systemContext).toContain('const hello')
    expect(cleanPrompt).toBe('explain')
    expect(warnings).toHaveLength(0)
  })

  it('warns when @file path not found', () => {
    const { warnings } = buildContext('@file missing.ts', defaultConfig)
    expect(warnings.some(w => w.includes('missing.ts'))).toBe(true)
  })

  it('respects maxFiles limit', () => {
    writeFileSync(join(tmp, 'a.ts'), 'a')
    writeFileSync(join(tmp, 'b.ts'), 'b')
    const cfg = { ...defaultConfig, context: { ...defaultConfig.context, maxFiles: 1 } }
    const { warnings } = buildContext(
      `@file ${join(tmp, 'a.ts')} @file ${join(tmp, 'b.ts')}`,
      cfg,
    )
    expect(warnings.some(w => w.includes('maxFiles'))).toBe(true)
  })

  it('handles @diff when includeGitDiff is false', () => {
    const cfg = { ...defaultConfig, context: { ...defaultConfig.context, includeGitDiff: false } }
    const { warnings } = buildContext('review @diff', cfg)
    expect(warnings.some(w => w.includes('includeGitDiff'))).toBe(true)
  })

  it('injects @selection from env var', () => {
    process.env.KARIGAR_SELECTION = 'function broken() { return nul }'
    const { systemContext } = buildContext('fix @selection', defaultConfig)
    expect(systemContext).toContain('broken')
  })

  it('warns when @selection env var is missing', () => {
    const { warnings } = buildContext('fix @selection', defaultConfig)
    expect(warnings.some(w => w.includes('@selection'))).toBe(true)
  })

  it('produces empty systemContext with no directives', () => {
    const { systemContext, cleanPrompt } = buildContext('hello world', defaultConfig)
    expect(systemContext).toBe('')
    expect(cleanPrompt).toBe('hello world')
  })
})
