import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OllamaProvider } from '../src/model/providers/ollama'
import { createModelClient } from '../src/model/client'
import { defaultConfig } from '../src/config/defaults'
import type { KarigarConfig } from '../src/config/types'

// Isolate config from ~/.karigar
let home: string
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'karigar-ask-test-'))
  process.env.KARIGAR_HOME = home
})
afterEach(() => {
  delete process.env.KARIGAR_HOME
  rmSync(home, { recursive: true, force: true })
  vi.restoreAllMocks()
})

/** Build a fake NDJSON streaming response body from an array of text chunks. */
function makeOllamaStream(chunks: string[]): Response {
  const lines = chunks.map((text, i) =>
    JSON.stringify({
      message: { role: 'assistant', content: text },
      done: i === chunks.length - 1,
    }),
  )
  const body = lines.join('\n') + '\n'
  return new Response(body, { status: 200 })
}

describe('OllamaProvider', () => {
  it('streams tokens from NDJSON chunks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeOllamaStream(['Hello', ' world', '!'])),
    )

    const provider = new OllamaProvider(defaultConfig.model)
    const tokens: string[] = []
    for await (const token of provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
    })) {
      tokens.push(token.text)
    }

    expect(tokens).toEqual(['Hello', ' world', '!'])
  })

  it('sets done=true on the final chunk', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeOllamaStream(['ok'])),
    )

    const provider = new OllamaProvider(defaultConfig.model)
    const collected: { text: string; done: boolean }[] = []
    for await (const token of provider.chat({
      messages: [{ role: 'user', content: 'ping' }],
    })) {
      collected.push(token)
    }

    expect(collected.at(-1)?.done).toBe(true)
  })

  it('throws a friendly error when Ollama is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    const provider = new OllamaProvider(defaultConfig.model)
    const iter = provider.chat({ messages: [{ role: 'user', content: 'hi' }] })
    await expect(iter[Symbol.asyncIterator]().next()).rejects.toThrow('Cannot reach Ollama')
  })

  it('throws on non-2xx status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('model not found', { status: 404 })),
    )

    const provider = new OllamaProvider(defaultConfig.model)
    const iter = provider.chat({ messages: [{ role: 'user', content: 'hi' }] })
    await expect(iter[Symbol.asyncIterator]().next()).rejects.toThrow('HTTP 404')
  })

  it('sends temperature and maxTokens from config', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeOllamaStream(['x']))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OllamaProvider(defaultConfig.model)
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'test' }],
    })) { /* consume */ }

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)
    expect(body.options.temperature).toBe(defaultConfig.model.temperature)
    expect(body.options.num_predict).toBe(defaultConfig.model.maxTokens)
    expect(body.stream).toBe(true)
  })
})

describe('createModelClient', () => {
  it('returns an OllamaProvider for the ollama provider', () => {
    const client = createModelClient(defaultConfig)
    expect(client).toBeInstanceOf(OllamaProvider)
  })

  it('supports remote provider (returns a FallbackClient)', () => {
    const cfg: KarigarConfig = {
      ...defaultConfig,
      model: { ...defaultConfig.model, provider: 'remote', baseUrl: 'https://example.com' },
    }
    const client = createModelClient(cfg)
    expect(typeof client.chat).toBe('function')
  })
})

describe('ask command in help output', () => {
  it('registers the ask command', async () => {
    const { createProgram } = await import('../src/cli')
    const help = createProgram().helpInformation()
    expect(help).toContain('ask')
  })
})
