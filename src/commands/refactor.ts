import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { buildContext } from '../context/assemble'
import { PROMPTS } from '../prompts/templates'

export function registerRefactor(program: Command): void {
  program
    .command('refactor')
    .description('Refactor a file for clarity and performance.')
    .argument('[target]', 'file path to refactor')
    .action(async (target?: string) => {
      const cfg = loadConfig()
      const client = createModelClient(cfg)

      const prompt = target ? `@file ${target}` : '@selection'
      const { systemContext, warnings } = buildContext(prompt, cfg)
      for (const w of warnings) logger.warn(w)

      if (!systemContext) {
        logger.error('Nothing to refactor. Provide a file path or set KARIGAR_SELECTION.')
        process.exit(1)
      }

      const spinner = cfg.ui.spinner ? ora({ text: 'Refactoring…', color: 'cyan' }).start() : null

      try {
        let firstToken = true
        for await (const token of client.chat({
          messages: [
            { role: 'system', content: PROMPTS.refactor },
            { role: 'system', content: systemContext },
            { role: 'user', content: 'Refactor this code.' },
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
