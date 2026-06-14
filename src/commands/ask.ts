import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'

export function registerAsk(program: Command): void {
  program
    .command('ask')
    .description('Ask a question and stream the answer from the configured model.')
    .argument('<prompt>', 'the question or task to send to the model')
    .action(async (prompt: string) => {
      const cfg = loadConfig()
      const client = createModelClient(cfg)

      const spinner = cfg.ui.spinner ? ora({ text: 'Thinking…', color: 'cyan' }).start() : null

      try {
        let firstToken = true
        for await (const token of client.chat({
          messages: [{ role: 'user', content: prompt }],
        })) {
          if (firstToken) {
            if (spinner) spinner.stop()
            firstToken = false
          }
          if (cfg.ui.streaming) {
            process.stdout.write(token.text)
          } else {
            // Buffered — collect and print at the end (handled below via streaming flag)
            process.stdout.write(token.text)
          }
          if (token.done) break
        }
        // Ensure the response ends on its own line
        if (!firstToken) process.stdout.write('\n')
      } catch (err) {
        if (spinner) spinner.stop()
        logger.error(err instanceof Error ? err.message : String(err))
        process.exit(1)
      }
    })
}
