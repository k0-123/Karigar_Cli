import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProgram, VERSION } from '../src/cli'
import { loadConfig, ensureFirstRun, isFirstRun } from '../src/utils/config'

// Isolate config I/O into a throwaway temp dir so tests never touch ~/.karigar.
let home: string
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'karigar-test-'))
  process.env.KARIGAR_HOME = home
})
afterEach(() => {
  delete process.env.KARIGAR_HOME
  rmSync(home, { recursive: true, force: true })
})

describe('program metadata', () => {
  it('exposes name and version', () => {
    const program = createProgram()
    expect(program.name()).toBe('karigar')
    expect(program.version()).toBe(VERSION)
  })

  it('renders usage help including the hello command', () => {
    const help = createProgram().helpInformation()
    expect(help).toContain('karigar')
    expect(help).toContain('hello')
    expect(help).toContain('Usage:')
  })
})

describe('hello command', () => {
  it('greets a custom name', () => {
    const program = createProgram().exitOverride()
    const lines: string[] = []
    const original = console.log
    console.log = (...args: unknown[]) => void lines.push(args.join(' '))
    try {
      program.parse(['node', 'karigar', 'hello', 'World'])
    } finally {
      console.log = original
    }
    expect(lines.join('\n')).toContain('Hello World')
  })
})

describe('config + first run', () => {
  it('reports first run before any config exists', () => {
    expect(isFirstRun()).toBe(true)
  })

  it('seeds defaults on first run and is idempotent', () => {
    const first = ensureFirstRun()
    expect(first.created).toBe(true)
    expect(isFirstRun()).toBe(false)
    const second = ensureFirstRun()
    expect(second.created).toBe(false)
  })

  it('loads default model settings', () => {
    const cfg = loadConfig()
    expect(cfg.model.provider).toBe('ollama')
    expect(cfg.model.name).toContain('qwen')
  })

  it('applies runtime overrides over defaults', () => {
    const cfg = loadConfig({ model: { name: 'custom-model' } as never })
    expect(cfg.model.name).toBe('custom-model')
    // Untouched fields fall back to defaults.
    expect(cfg.model.provider).toBe('ollama')
  })
})
