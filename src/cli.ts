import { Command } from 'commander'
import { registerHello } from './commands/hello'

export const VERSION = '0.1.0'

/**
 * Build the Commander program. Kept separate from `index.ts` (the executable
 * entry) so tests can construct and inspect the program without spawning a process.
 */
export function createProgram(): Command {
  const program = new Command()

  program
    .name('karigar')
    .description('A minimal, terminal-native, streaming CLI coding assistant.')
    .version(VERSION, '-v, --version', 'output the current version')
    .showHelpAfterError('(add --help for additional information)')

  // Command registry — new commands are registered here in later phases.
  registerHello(program)

  return program
}
