import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSession, addToHistory, clearHistory } from '../src/repl/session'
import { PROMPTS, SYSTEM_BASE } from '../src/prompts/templates'

let home: string
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'karigar-p4-'))
  process.env.KARIGAR_HOME = home
})
afterEach(() => {
  delete process.env.KARIGAR_HOME
  rmSync(home, { recursive: true, force: true })
  vi.restoreAllMocks()
})

// ── session ──────────────────────────────────────────────────────────────────

describe('session', () => {
  it('starts with empty history', () => {
    const s = createSession('qwen2.5-coder:7b')
    expect(s.history).toHaveLength(0)
    expect(s.model).toBe('qwen2.5-coder:7b')
  })

  it('adds messages to history', () => {
    const s = createSession('test-model')
    addToHistory(s, 'user', 'hello')
    addToHistory(s, 'assistant', 'hi')
    expect(s.history).toHaveLength(2)
    expect(s.history[0]).toMatchObject({ role: 'user', content: 'hello' })
    expect(s.history[1]).toMatchObject({ role: 'assistant', content: 'hi' })
  })

  it('clears history', () => {
    const s = createSession('test-model')
    addToHistory(s, 'user', 'message')
    clearHistory(s)
    expect(s.history).toHaveLength(0)
  })
})

// ── prompt templates ──────────────────────────────────────────────────────────

describe('prompt templates', () => {
  it('SYSTEM_BASE is a non-empty string', () => {
    expect(typeof SYSTEM_BASE).toBe('string')
    expect(SYSTEM_BASE.length).toBeGreaterThan(10)
  })

  it('all prompt kinds are defined', () => {
    const kinds = ['code', 'fix', 'explain', 'test', 'refactor'] as const
    for (const kind of kinds) {
      expect(typeof PROMPTS[kind]).toBe('string')
      expect(PROMPTS[kind].length).toBeGreaterThan(0)
    }
  })

  it('each prompt includes SYSTEM_BASE', () => {
    for (const key of Object.keys(PROMPTS) as Array<keyof typeof PROMPTS>) {
      expect(PROMPTS[key]).toContain(SYSTEM_BASE)
    }
  })
})

// ── cli command registration ──────────────────────────────────────────────────

describe('command registration', () => {
  it('registers all Phase 4 commands', async () => {
    const { createProgram } = await import('../src/cli')
    const help = createProgram().helpInformation()
    for (const cmd of ['code', 'fix', 'explain', 'test', 'refactor']) {
      expect(help).toContain(cmd)
    }
  })
})

// ── runner (unit — no subprocess) ────────────────────────────────────────────

describe('runWithConfirm', () => {
  it('returns null when user declines', async () => {
    // Mock readline to return 'n'
    vi.mock('node:readline/promises', () => ({
      createInterface: () => ({
        question: vi.fn().mockResolvedValue('n'),
        close: vi.fn(),
      }),
    }))
    const { runWithConfirm } = await import('../src/runner/exec')
    const result = await runWithConfirm('echo hello')
    expect(result).toBeNull()
  })
})
