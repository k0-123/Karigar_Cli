import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { buildContext } from '../context/assemble'
import { PROMPTS } from '../prompts/templates'
import { runWithConfirm } from '../runner/exec'

export function registerTest(program: Command): void {
  program
    .command('test')
    .description('Generate tests for a file.')
    .argument('[target]', 'file path to generate tests for')
    .option('-r, --run <cmd>', 'run command after tests are shown (e.g. "npm test")')
    .action(async (target: string | undefined, opts: { run?: string }) => {
      const cfg = loadConfig()
      const client = createModelClient(cfg)

      const prompt = target ? `@file ${target}` : '@selection'
      const { systemContext, warnings } = buildContext(prompt, cfg)
      for (const w of warnings) logger.warn(w)

      if (!systemContext) {
        logger.error('Nothing to test. Provide a file path or set KARIGAR_SELECTION.')
        process.exit(1)
      }

      const spinner = cfg.ui.spinner ? ora({ text: 'Generating tests…', color: 'cyan' }).start() : null

      try {
        let firstToken = true
        for await (const token of client.chat({
          messages: [
            { role: 'system', content: PROMPTS.test },
            { role: 'system', content: systemContext },
            { role: 'user', content: 'Generate tests for this code.' },
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
