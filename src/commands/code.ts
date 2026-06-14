import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { PROMPTS } from '../prompts/templates'

export function registerCode(program: Command): void {
  program
    .command('code')
    .description('Generate code for a described task.')
    .argument('<task>', 'describe what to build')
    .action(async (task: string) => {
      const cfg = loadConfig()
      const client = createModelClient(cfg)
      const spinner = cfg.ui.spinner ? ora({ text: 'Generating…', color: 'cyan' }).start() : null

      try {
        let firstToken = true
        for await (const token of client.chat({
          messages: [
            { role: 'system', content: PROMPTS.code },
            { role: 'user', content: task },
          ],
        })) {
          if (firstToken) { if (spinner) spinner.stop(); firstToken = false }
          process.stdout.write(token.text)
          if (token.done) break
        }
        process.stdout.write('\n')
      } catch (err) {
        if (spinner) spinner.stop()
        logger.error(err instanceof Error ? err.message : String(err))
        process.exit(1)
      }
    })
}
