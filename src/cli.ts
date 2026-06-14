import { Command } from 'commander'
import { registerHello } from './commands/hello'
import { registerAsk } from './commands/ask'
import { registerCode } from './commands/code'
import { registerFix } from './commands/fix'
import { registerExplain } from './commands/explain'
import { registerTest } from './commands/test'
import { registerRefactor } from './commands/refactor'
import { registerConnect } from './commands/connect'
import { registerStatus } from './commands/status'
import { registerFleet } from './commands/fleet'
import { startRepl } from './repl/loop'

export const VERSION = '0.1.0'

export function createProgram(): Command {
  const program = new Command()

  program
    .name('karigar')
    .description('A minimal, terminal-native, streaming CLI coding assistant.')
    .version(VERSION, '-v, --version', 'output the current version')
    .showHelpAfterError('(add --help for additional information)')

  registerHello(program)
  registerAsk(program)
  registerCode(program)
  registerFix(program)
  registerExplain(program)
  registerTest(program)
  registerRefactor(program)
  registerConnect(program)
  registerStatus(program)
  registerFleet(program)

  program.action(async () => { await startRepl() })

  return program
}
