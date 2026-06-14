import type { Command } from 'commander'
import chalk from 'chalk'
import { loadConfig } from '../utils/config'

/**
 * `karigar hello [name]` — a smoke-test command proving the CLI harness,
 * argument parsing, and config loading all work end to end.
 */
export function registerHello(program: Command): void {
  program
    .command('hello')
    .description('Print a friendly greeting (smoke test for the CLI harness).')
    .argument('[name]', 'who to greet', 'Karigar')
    .option('-s, --shout', 'greet in uppercase')
    .action((name: string, opts: { shout?: boolean }) => {
      const cfg = loadConfig()
      let msg = `Hello ${name}! 👋  (configured model: ${cfg.model.name})`
      if (opts.shout) msg = msg.toUpperCase()
      console.log(cfg.ui.color ? chalk.cyan(msg) : msg)
    })
}
