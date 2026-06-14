import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { buildContext } from '../context/assemble'

export function registerAsk(program: Command): void {
  program
    .command('ask')
    .description('Ask a question and stream the answer. Supports @file, @diff, @selection.')
    .argument('<prompt>', 'the question or task — use @file <path>, @diff, @selection for context')
    .action(async (prompt: string) => {
      const cfg = loadConfig()
      const client = createModelClient(cfg)

      const { cleanPrompt, systemContext, warnings } = buildContext(prompt, cfg)

      for (const w of warnings) logger.warn(w)

      const messages: { role: 'system' | 'user'; content: string }[] = []
      if (systemContext) messages.push({ role: 'system', content: systemContext })
      messages.push({ role: 'user', content: cleanPrompt })

      const spinner = cfg.ui.spinner ? ora({ text: 'Thinking…', color: 'cyan' }).start() : null

      try {
        let firstToken = true
        for await (const token of client.chat({ messages })) {
          if (firstToken) {
            if (spinner) spinner.stop()
            firstToken = false
          }
          process.stdout.write(token.text)
          if (token.done) break
        }
        if (!firstToken) process.stdout.write('\n')
      } catch (err) {
        if (spinner) spinner.stop()
        logger.error(err instanceof Error ? err.message : String(err))
        process.exit(1)
      }
    })
}
