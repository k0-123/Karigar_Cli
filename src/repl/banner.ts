import chalk from 'chalk'
import type { KarigarConfig } from '../config/types'

const INNER_WIDTH = 53

// Strip ANSI color codes so we can measure the *visible* length of a line.
// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g
function visibleLen(s: string): number {
  return s.replace(ANSI, '').length
}

/** Pad a (possibly colored) string to INNER_WIDTH visible chars. */
function pad(s: string): string {
  const gap = INNER_WIDTH - visibleLen(s)
  return s + ' '.repeat(Math.max(0, gap))
}

function row(content: string): string {
  return chalk.cyan('│ ') + pad(content) + chalk.cyan(' │')
}

/**
 * Render the welcome banner shown when `karigar` is launched with no subcommand.
 * Mirrors the polished boxed intro of modern AI CLIs, with live fleet status.
 */
export function renderBanner(cfg: KarigarConfig): string {
  const top = chalk.cyan('╭' + '─'.repeat(INNER_WIDTH + 2) + '╮')
  const bot = chalk.cyan('╰' + '─'.repeat(INNER_WIDTH + 2) + '╯')
  const blank = row('')

  const fleetCount = cfg.fleet?.length ?? 0
  const fleetLine =
    fleetCount > 0
      ? chalk.green('●') + chalk.dim(`  ${fleetCount} GPU node${fleetCount > 1 ? 's' : ''} `) +
        chalk.dim('(' + cfg.fleet.map(n => n.provider).join(', ') + ')')
      : chalk.yellow('○') + chalk.dim('  no fleet — using local Ollama')

  const lines = [
    top,
    blank,
    row(chalk.cyan.bold('  K A R I G A R') + chalk.dim('   terminal coding assistant')),
    blank,
    row(chalk.dim('  Fleet  ') + fleetLine),
    row(chalk.dim('  Tip    ') + chalk.dim('type ') + chalk.yellow('/help') + chalk.dim(' for commands, ') + chalk.yellow('/exit') + chalk.dim(' to quit')),
    blank,
    bot,
  ]

  return lines.join('\n')
}
