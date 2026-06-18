import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { classifyTier } from '../classifier/tier'
import { buildContext } from '../context/assemble'
import { PROMPTS } from '../prompts/templates'

export function registerExplain(program: Command): void {
  program
    .command('explain')
    .description('Explain a file or code snippet. Pass a file path or use @file/@diff.')
    .argument('[target]', 'file path to explain (shorthand for @file <path>)')
    .action(async (target?: string) => {
      const cfg = loadConfig()
      const prompt = target ? `@file ${target}` : '@selection'
      const { tier } = classifyTier(prompt)
      const client = createModelClient(cfg, tier)

      const { systemContext, warnings } = buildContext(prompt, cfg)
      for (const w of warnings) logger.warn(w)

      if (!systemContext) {
        logger.error('Nothing to explain. Provide a file path or set KARIGAR_SELECTION.')
        process.exit(1)
      }

      const spinner = cfg.ui.spinner ? ora({ text: 'Analysing…', color: 'cyan' }).start() : null

      try {
        let firstToken = true
        for await (const token of client.chat({
          messages: [
            { role: 'system', content: PROMPTS.explain },
            { role: 'system', content: systemContext },
            { role: 'user', content: 'Explain this code.' },
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
