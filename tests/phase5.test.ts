import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { classifyTier, modelForTier } from '../src/classifier/tier'
import { createModelClient } from '../src/model/client'
import { OllamaProvider } from '../src/model/providers/ollama'
import { OpenAICompatibleProvider } from '../src/model/providers/openai-compatible'
import { RemoteProvider } from '../src/model/providers/remote'
import { defaultConfig } from '../src/config/defaults'
import { configPath } from '../src/utils/config'
import type { KarigarConfig } from '../src/config/types'

let home: string
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'karigar-p5-'))
  process.env.KARIGAR_HOME = home
})
afterEach(() => {
  delete process.env.KARIGAR_HOME
  rmSync(home, { recursive: true, force: true })
  vi.restoreAllMocks()
})

// ── classifier ───────────────────────────────────────────────────────────────

describe('classifyTier', () => {
  it('classifies short casual prompts as fast', () => {
    expect(classifyTier('hey what is up').tier).toBe('fast')
    expect(classifyTier('thanks').tier).toBe('fast')
  })

  it('classifies coding tasks as medium', () => {
    expect(classifyTier('write a function to reverse a string').tier).toBe('medium')
    expect(classifyTier('fix this bug in my code').tier).toBe('medium')
  })

  it('classifies architecture/debugging as complex', () => {
    expect(classifyTier('help me redesign the architecture of this module').tier).toBe('complex')
    expect(classifyTier('debug this complex performance issue in the database').tier).toBe('complex')
  })

  it('classifies long prompts as complex', () => {
    const long = 'explain '.repeat(45)
    expect(classifyTier(long).tier).toBe('complex')
  })

  it('classifies prompts with @file and substantial text as complex', () => {
    const prompt = '@file src/app.ts ' + 'please review this carefully and tell me everything '.repeat(2)
    expect(classifyTier(prompt).tier).toBe('complex')
  })

  it('modelForTier maps fast vs others', () => {
    // Only the complex tier uses the heavier coding model; fast and medium use
    // the fast model (see "route medium tier to fastModel" change).
    expect(modelForTier('fast', 'deepseek-r1:1.5b', 'qwen2.5-coder:14b')).toBe('deepseek-r1:1.5b')
    expect(modelForTier('medium', 'deepseek-r1:1.5b', 'qwen2.5-coder:14b')).toBe('deepseek-r1:1.5b')
    expect(modelForTier('complex', 'deepseek-r1:1.5b', 'qwen2.5-coder:14b')).toBe('qwen2.5-coder:14b')
  })
})

// ── createModelClient ─────────────────────────────────────────────────────────

describe('createModelClient providers', () => {
  it('returns OllamaProvider for ollama', () => {
    expect(createModelClient(defaultConfig)).toBeInstanceOf(OllamaProvider)
  })

  it('returns OpenAICompatibleProvider for openai-compatible', () => {
    const cfg: KarigarConfig = { ...defaultConfig, model: { ...defaultConfig.model, provider: 'openai-compatible' } }
    expect(createModelClient(cfg)).toBeInstanceOf(OpenAICompatibleProvider)
  })

  it('returns a FallbackClient (not the raw RemoteProvider) for remote', () => {
    const cfg: KarigarConfig = { ...defaultConfig, model: { ...defaultConfig.model, provider: 'remote', baseUrl: 'https://example.com' } }
    const client = createModelClient(cfg)
    expect(client).not.toBeInstanceOf(RemoteProvider)
    expect(client).not.toBeInstanceOf(OllamaProvider)
    expect(typeof client.chat).toBe('function')
  })
})

// ── FallbackClient behaviour ────────────────────────────────────────────────

describe('remote provider fallback', () => {
  it('falls back to local Ollama when remote is unreachable', async () => {
    const cfg: KarigarConfig = { ...defaultConfig, model: { ...defaultConfig.model, provider: 'remote', baseUrl: 'https://unreachable.invalid' } }

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('unreachable.invalid')) return Promise.reject(new Error('ENOTFOUND'))
      // Local Ollama responds successfully
      const body = JSON.stringify({ message: { content: 'fallback ok' }, done: true }) + '\n'
      return Promise.resolve(new Response(body, { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = createModelClient(cfg, 'fast')
    const tokens: string[] = []
    for await (const token of client.chat({ messages: [{ role: 'user', content: 'hi' }] })) {
      tokens.push(token.text)
    }
    expect(tokens.join('')).toBe('fallback ok')
  })
})

// ── OpenAICompatibleProvider ────────────────────────────────────────────────

describe('OpenAICompatibleProvider', () => {
  it('streams SSE-formatted chunks', async () => {
    const sse = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hi' }, finish_reason: null }] }),
      'data: ' + JSON.stringify({ choices: [{ delta: { content: '!' }, finish_reason: 'stop' }] }),
      'data: [DONE]',
    ].join('\n') + '\n'

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse, { status: 200 })))

    const provider = new OpenAICompatibleProvider(defaultConfig.model)
    const tokens: string[] = []
    for await (const token of provider.chat({ messages: [{ role: 'user', content: 'hi' }] })) {
      tokens.push(token.text)
    }
    expect(tokens).toEqual(['Hi', '!'])
  })

  it('includes Authorization header when apiKey is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const cfg = { ...defaultConfig.model, apiKey: 'secret-token' }
    const provider = new OpenAICompatibleProvider(cfg)
    for await (const _ of provider.chat({ messages: [{ role: 'user', content: 'hi' }] })) { /* drain */ }

    const headers = (fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }])[1].headers
    expect(headers['Authorization']).toBe('Bearer secret-token')
  })
})

// ── karigar connect ──────────────────────────────────────────────────────────

describe('connect command', () => {
  it('writes provider=remote and baseUrl to config', async () => {
    const { createProgram } = await import('../src/cli')
    const program = createProgram().exitOverride()
    await program.parseAsync(['node', 'karigar', 'connect', 'https://my-server.example.com'])

    expect(existsSync(configPath())).toBe(true)
    const written = JSON.parse(readFileSync(configPath(), 'utf8'))
    expect(written.model.provider).toBe('remote')
    expect(written.model.baseUrl).toBe('https://my-server.example.com')
  })

  it('saves token when --token is passed', async () => {
    const { createProgram } = await import('../src/cli')
    const program = createProgram().exitOverride()
    await program.parseAsync(['node', 'karigar', 'connect', 'https://my-server.example.com', '--token', 'abc123'])

    const written = JSON.parse(readFileSync(configPath(), 'utf8'))
    expect(written.model.apiKey).toBe('abc123')
  })
})
