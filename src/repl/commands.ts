import chalk from 'chalk'

/** One slash command in the REPL. */
export interface SlashCommand {
  name: string
  /** Short one-line description shown in the menu / help. */
  description: string
  /** Optional usage hint (e.g. arguments). */
  usage?: string
}

/**
 * The single source of truth for every `/` command. Used by the help text, the
 * live `/` menu, and Tab completion so they never drift apart.
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  { name: '/help', description: 'Show all commands and context tips' },
  { name: '/plan', description: 'Plan mode — outline steps before writing code' },
  { name: '/god', description: 'God mode — max-power autonomous engineer' },
  { name: '/model', description: 'Switch the active model (interactive picker)' },
  { name: '/clear', description: 'Clear the conversation history' },
  { name: '/status', description: 'Show provider, model, mode, and fleet status' },
  { name: '/exit', description: 'Exit Karigar' },
]

/** Context directives usable inside any prompt. */
export const CONTEXT_DIRECTIVES: SlashCommand[] = [
  { name: '@file', description: 'Include a file', usage: '@file <path>' },
  { name: '@dir', description: 'Include a directory', usage: '@dir <path>' },
  { name: '@diff', description: 'Include staged + unstaged git changes' },
  { name: '@selection', description: 'Include your editor selection' },
]

/** Longest command name — used to align the menu columns. */
const NAME_WIDTH = Math.max(...SLASH_COMMANDS.map((c) => c.name.length)) + 2

/**
 * Render the `/` command menu, Claude-CLI style: every command listed with its
 * description. `filter` narrows the list to commands starting with that prefix.
 */
export function renderSlashMenu(filter = ''): string {
  const matches = SLASH_COMMANDS.filter((c) => c.name.startsWith(filter))
  const lines: string[] = []
  lines.push('')
  lines.push(chalk.bold('  Commands'))
  if (matches.length === 0) {
    lines.push(chalk.dim(`  no command matches "${filter}"`))
  } else {
    for (const c of matches) {
      lines.push(
        '  ' +
          chalk.hex('#E0A83C')(c.name.padEnd(NAME_WIDTH)) +
          chalk.dim(c.description),
      )
    }
  }
  lines.push('')
  lines.push(
    '  ' +
      chalk.dim('Context: ') +
      CONTEXT_DIRECTIVES.map((d) => chalk.hex('#E0A83C')(d.usage ?? d.name)).join(
        chalk.dim(' · '),
      ),
  )
  lines.push('')
  return lines.join('\n')
}

/**
 * readline completer: completes `/` commands. Returns the matching command
 * names (or all of them on a bare `/`) so Tab cycles/lists them.
 */
export function slashCompleter(line: string): [string[], string] {
  if (!line.startsWith('/')) return [[], line]
  const hits = SLASH_COMMANDS.map((c) => c.name).filter((n) => n.startsWith(line))
  return [hits.length ? hits : SLASH_COMMANDS.map((c) => c.name), line]
}
