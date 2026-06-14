import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { buildContext } from '../context/assemble'
import { createSession, addToHistory, clearHistory } from './session'
import { SYSTEM_BASE } from '../prompts/templates'
import type { ChatMessage } from '../model/types'

const PROMPT = chalk.cyan('karigar') + chalk.dim(' › ')

function printHelp(): void {
  console.log(`
${chalk.cyan.bold('Karigar REPL')}
  Type a question or task — use ${chalk.yellow('@file <path>')}, ${chalk.yellow('@diff')}, ${chalk.yellow('@selection')} for context.

${chalk.bold('Slash commands:')}
  ${chalk.yellow('/clear')}   Clear conversation history
  ${chalk.yellow('/model')}   Show current model
  ${chalk.yellow('/help')}    Show this help
  ${chalk.yellow('/exit')}    Exit the REPL
`)
}

export async function startRepl(): Promise<void> {
  const cfg = loadConfig()
  const client = createModelClient(cfg)
  const session = createSession(cfg.model.name)

  logger.brand('Karigar ⚒')
  logger.dim(`Model: ${cfg.model.name}  |  Type /help for commands, Ctrl+C to exit\n`)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  rl.on('close', () => {
    console.log(chalk.dim('\nBye.'))
    process.exit(0)
  })

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let input: string
    try {
      input = (await rl.question(PROMPT)).trim()
    } catch {
      break
    }

    if (!input) continue

    // Slash commands
    if (input.startsWith('/')) {
      const cmd = input.split(' ')[0]
      if (cmd === '/exit') { rl.close(); break }
      if (cmd === '/clear') { clearHistory(session); logger.dim('History cleared.'); continue }
      if (cmd === '/model') { logger.info(`Model: ${session.model}`); continue }
      if (cmd === '/help') { printHelp(); continue }
      logger.warn(`Unknown command: ${cmd}. Type /help.`)
      continue
    }

    const { cleanPrompt, systemContext, warnings } = buildContext(input, cfg)
    for (const w of warnings) logger.warn(w)

    const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_BASE }]
    if (systemContext) messages.push({ role: 'system', content: systemContext })
    messages.push(...session.history)
    messages.push({ role: 'user', content: cleanPrompt })

    const spinner = cfg.ui.spinner ? ora({ text: 'Thinking…', color: 'cyan' }).start() : null
    let reply = ''

    try {
      let firstToken = true
      for await (const token of client.chat({ messages })) {
        if (firstToken) {
          if (spinner) spinner.stop()
          firstToken = false
        }
        process.stdout.write(token.text)
        reply += token.text
        if (token.done) break
      }
      if (reply) process.stdout.write('\n')
    } catch (err) {
      if (spinner) spinner.stop()
      logger.error(err instanceof Error ? err.message : String(err))
      continue
    }

    if (reply) {
      addToHistory(session, 'user', cleanPrompt)
      addToHistory(session, 'assistant', reply)
    }

    console.log()
  }
}
