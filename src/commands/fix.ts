import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { buildContext } from '../context/assemble'
import { PROMPTS } from '../prompts/templates'
import { runWithConfirm } from '../runner/exec'

export function registerFix(program: Command): void {
  program
    .command('fix')
    .description('Find and fix bugs in a file.')
    .argument('[target]', 'file path to fix (shorthand for @file <path>)')
    .option('-r, --run <cmd>', 'verification command to run after the fix is shown')
    .action(async (target: string | undefined, opts: { run?: string }) => {
      const cfg = loadConfig()
      const client = createModelClient(cfg)

      const prompt = target ? `@file ${target}` : '@diff'
      const { systemContext, warnings } = buildContext(prompt, cfg)
      for (const w of warnings) logger.warn(w)

      if (!systemContext) {
        logger.error('Nothing to fix. Provide a file path or use @diff.')
        process.exit(1)
      }

      const spinner = cfg.ui.spinner ? ora({ text: 'Analysing…', color: 'cyan' }).start() : null

      try {
        let firstToken = true
        for await (const token of client.chat({
          messages: [
            { role: 'system', content: PROMPTS.fix },
            { role: 'system', content: systemContext },
            { role: 'user', content: 'Fix the bugs in this code.' },
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

      if (opts.run) await runWithConfirm(opts.run)
    })
}
