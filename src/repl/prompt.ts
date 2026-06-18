/**
 * Interactive prompt reader with a live slash-command palette — Claude-CLI
 * style. Typing `/` opens a dropdown of every command; ↑/↓ (and PgUp/PgDn)
 * move the highlight; Enter runs the highlighted command; Tab completes it;
 * Esc dismisses the menu. Falls back to a plain line read on non-TTY stdin.
 *
 * Implemented with raw-mode keypress handling so we fully control rendering;
 * raw mode is enabled only while waiting for a line, so streaming output and
 * spinners between turns behave normally.
 */

import readline from 'node:readline'
import chalk from 'chalk'
import { SLASH_COMMANDS, type SlashCommand } from './commands'

const AMBER = '#E0A83C'
const SANDSTONE = '#C88A4A'

/** The visible prompt; the brand word is now theme amber, not cyan. */
export const PROMPT = chalk.hex(AMBER).bold('karigar') + chalk.dim(' › ')
const PROMPT_COLS = 'karigar › '.length // visible width of the prompt
const PAGE = 5

export interface PromptResult {
  type: 'line' | 'eof' | 'sigint'
  value: string
}

const ESC = '\x1b['

function matchesFor(buf: string): SlashCommand[] {
  if (!buf.startsWith('/')) return []
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(buf))
}

/** Render the dropdown lines for the current buffer + selection. */
function menuLines(buf: string, sel: number): string[] {
  const matches = matchesFor(buf)
  const lines: string[] = []
  if (matches.length === 0) {
    lines.push(chalk.dim('   no command matches ') + chalk.hex(AMBER)(buf))
    return lines
  }
  const nameW = Math.max(...matches.map((m) => m.name.length)) + 2
  matches.forEach((c, i) => {
    if (i === sel) {
      lines.push(
        chalk.hex(AMBER)(' ❯ ') +
          chalk.hex(AMBER).bold(c.name.padEnd(nameW)) +
          chalk.white(c.description),
      )
    } else {
      lines.push(
        '   ' + chalk.hex(SANDSTONE)(c.name.padEnd(nameW)) + chalk.dim(c.description),
      )
    }
  })
  lines.push(
    chalk.dim('   ↑↓ navigate · PgUp/PgDn jump · Enter run · Tab complete · Esc dismiss'),
  )
  return lines
}

/**
 * Read one line interactively. Resolves with the typed line, or with a
 * highlighted slash command when the user presses Enter on the open menu.
 */
export function readPrompt(): Promise<PromptResult> {
  const stdin = process.stdin
  const stdout = process.stdout

  // Non-interactive stdin: simple line read, no palette.
  if (!stdin.isTTY) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: stdin })
      stdout.write(PROMPT)
      rl.once('line', (line) => {
        rl.close()
        resolve({ type: 'line', value: line })
      })
      rl.once('close', () => resolve({ type: 'eof', value: '' }))
    })
  }

  return new Promise((resolve) => {
    let buf = ''
    let cursor = 0
    let sel = 0
    let menuOpen = false // derived from buf, but Esc can force it closed
    let escDismissed = false
    let drawnMenu = 0 // menu lines drawn last render (to erase)

    readline.emitKeypressEvents(stdin)
    stdin.setRawMode(true)
    stdin.resume()

    function computeMenuOpen(): boolean {
      return buf.startsWith('/') && !escDismissed
    }

    function render(): void {
      // Return to prompt line, clear it and everything below.
      stdout.write('\r' + ESC + '0J')
      stdout.write(PROMPT + buf)

      menuOpen = computeMenuOpen()
      const lines = menuOpen ? menuLines(buf, sel) : []
      drawnMenu = lines.length
      if (lines.length) {
        stdout.write('\n' + lines.join('\n'))
        stdout.write(ESC + lines.length + 'A') // move back up to prompt line
      }
      // Place the cursor at the right column on the prompt line.
      stdout.write('\r')
      const col = PROMPT_COLS + cursor
      if (col > 0) stdout.write(ESC + col + 'C')
    }

    function cleanup(): void {
      stdin.removeListener('keypress', onKey)
      stdin.setRawMode(false)
      // Erase any open menu, drop to a fresh line.
      if (drawnMenu) stdout.write(ESC + '0J')
      stdout.write('\n')
    }

    function finish(result: PromptResult): void {
      cleanup()
      resolve(result)
    }

    function onKey(str: string | undefined, key: readline.Key): void {
      const name = key?.name
      const matches = matchesFor(buf)

      // Ctrl-C → SIGINT; Ctrl-D on empty → EOF.
      if (key?.ctrl && name === 'c') return finish({ type: 'sigint', value: '' })
      if (key?.ctrl && name === 'd' && buf === '') return finish({ type: 'eof', value: '' })

      const open = computeMenuOpen() && matches.length > 0

      switch (name) {
        case 'return':
        case 'enter': {
          if (open) {
            const chosen = matches[Math.min(sel, matches.length - 1)].name
            return finish({ type: 'line', value: chosen })
          }
          return finish({ type: 'line', value: buf })
        }
        case 'up':
          if (open) { sel = Math.max(0, sel - 1); render() }
          return
        case 'down':
          if (open) { sel = Math.min(matches.length - 1, sel + 1); render() }
          return
        case 'pageup':
          if (open) { sel = Math.max(0, sel - PAGE); render() }
          return
        case 'pagedown':
          if (open) { sel = Math.min(matches.length - 1, sel + PAGE); render() }
          return
        case 'tab':
          if (open) {
            buf = matches[Math.min(sel, matches.length - 1)].name
            cursor = buf.length
            sel = 0
            render()
          }
          return
        case 'escape':
          if (menuOpen) { escDismissed = true; render() }
          return
        case 'left':
          if (cursor > 0) { cursor--; render() }
          return
        case 'right':
          if (cursor < buf.length) { cursor++; render() }
          return
        case 'home':
          cursor = 0; render(); return
        case 'end':
          cursor = buf.length; render(); return
        case 'backspace':
          if (cursor > 0) {
            buf = buf.slice(0, cursor - 1) + buf.slice(cursor)
            cursor--
            escDismissed = false
            sel = 0
            render()
          }
          return
        default: {
          // Insert printable characters (ignore other control sequences).
          if (str && !key?.ctrl && !key?.meta && str >= ' ') {
            buf = buf.slice(0, cursor) + str + buf.slice(cursor)
            cursor += str.length
            escDismissed = false
            sel = 0
            render()
          }
          return
        }
      }
    }

    stdin.on('keypress', onKey)
    render()
  })
}
