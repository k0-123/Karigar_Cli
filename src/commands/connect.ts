import type { Command } from 'commander'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { configPath, ensureFirstRun } from '../utils/config'
import { logger } from '../utils/logger'

export function registerConnect(program: Command): void {
  program
    .command('connect')
    .description('Connect to a Karigar backend server (sets provider to remote).')
    .argument('<url>', 'server URL, e.g. https://karigar.yourdomain.com')
    .option('-t, --token <token>', 'server-issued auth token (optional)')
    .action((url: string, opts: { token?: string }) => {
      ensureFirstRun()

      let config: Record<string, unknown> = {}
      const path = configPath()
      if (existsSync(path)) {
        try { config = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown> } catch { /* ignore */ }
      }

      const model = (config.model ?? {}) as Record<string, unknown>
      model.provider = 'remote'
      model.baseUrl = url.replace(/\/$/, '')
      if (opts.token) model.apiKey = opts.token
      config.model = model

      writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf8')

      logger.success(`Connected to ${model.baseUrl}`)
      logger.dim('Provider set to "remote" — local Ollama used as fallback.')
      logger.dim(`Config saved to ${path}`)
    })
}
