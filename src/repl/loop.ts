import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { FleetProvider } from '../model/providers/fleet'
import { buildContext } from '../context/assemble'
import { createSession, addToHistory, clearHistory } from './session'
import { renderDashboard } from '../ui/dashboard'
import { recordSessionStart, recordSessionEnd } from './sessionStore'
import { pickModel } from './models'
import { readPrompt } from './prompt'
import { renderSlashMenu } from './commands'
import { SYSTEM_BASE, SYSTEM_PLAN, SYSTEM_GOD } from '../prompts/templates'
import { classifyTier } from '../classifier/tier'
import type { ChatMessage } from '../model/types'
import type { ReplMode } from './session'

const MAX_HISTORY_PAIRS = 20

function modelLabel(override: string | null, defaultName: string): string {
  return override ? chalk.hex('#E0A83C')(override) : chalk.dim(`${defaultName} (auto)`)
}

/** Compact inline status for the `/status` command. */
function printStatus(cfg: ReturnType<typeof loadConfig>, override: string | null, mode: ReplMode): void {
  const fleetCount = cfg.fleet?.length ?? 0
  const row = (k: string, v: string) => '  ' + chalk.dim(k.padEnd(12)) + v
  const modeLabel =
    mode === 'plan'
      ? chalk.hex('#7A8A5C')('plan ◆')
      : mode === 'god'
        ? chalk.hex('#E0A83C')('god ⚡')
        : chalk.dim('normal')
  console.log('')
  console.log(chalk.bold('  Status'))
  console.log(row('Provider', cfg.model.provider))
  console.log(row('Model', override ? `${override}` : `${cfg.model.name} ${chalk.dim('(auto)')}`))
  console.log(row('Mode', modeLabel))
  console.log(
    row(
      'Fleet',
      fleetCount > 0
        ? chalk.green(`${fleetCount} node${fleetCount > 1 ? 's' : ''} `) +
            chalk.dim('(' + cfg.fleet.map((n) => n.provider).join(', ') + ')')
        : chalk.dim('local Ollama'),
    ),
  )
  console.log('')
}

export async function startRepl(): Promise<void> {
  const cfg = loadConfig()
  const session = createSession(cfg.model.name)
  const sessionMeta = recordSessionStart(cfg.model.name, Date.now())

  console.log(renderDashboard(cfg))
  console.log()

  const quit = (): never => {
    recordSessionEnd(sessionMeta, Date.now())
    console.log(chalk.dim('\nBye.'))
    process.exit(0)
  }

  const fleetClient = cfg.fleet?.length ? new FleetProvider(cfg.fleet) : null

  while (true) {
    const res = await readPrompt()
    if (res.type === 'eof' || res.type === 'sigint') quit()
    const input = res.value.trim()

    if (!input) continue

    // Slash commands
    if (input.startsWith('/')) {
      const cmd = input.split(' ')[0]

      if (cmd === '/exit') quit()

      if (cmd === '/clear') {
        clearHistory(session)
        logger.dim('History cleared.')
        continue
      }

      if (cmd === '/status') {
        printStatus(cfg, session.modelOverride, session.mode)
        continue
      }

      if (cmd === '/plan') {
        session.mode = session.mode === 'plan' ? 'normal' : 'plan'
        if (session.mode === 'plan') {
          console.log(chalk.hex('#7A8A5C').bold('  ◆ Plan mode on') + chalk.dim(' — Karigar will outline steps before coding. /plan again to turn off.'))
        } else {
          console.log(chalk.dim('  Plan mode off — back to normal.'))
        }
        console.log()
        continue
      }

      if (cmd === '/god') {
        session.mode = session.mode === 'god' ? 'normal' : 'god'
        if (session.mode === 'god') {
          console.log(chalk.hex('#E0A83C').bold('  ⚡ God mode on') + chalk.dim(' — max-power autonomous engineer. /god again to turn off.'))
        } else {
          console.log(chalk.dim('  God mode off — back to normal.'))
        }
        console.log()
        continue
      }

      if (cmd === '/model') {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        try {
          const chosen = await pickModel(cfg, rl, session.modelOverride)
          if (chosen === undefined) {
            // cancelled
          } else if (chosen === null) {
            session.modelOverride = null
            console.log(chalk.dim('  Model set to ') + chalk.hex('#E0A83C')('auto') + chalk.dim(' (picks by request tier)'))
          } else {
            session.modelOverride = chosen
            console.log(chalk.dim('  Model set to ') + chalk.hex('#E0A83C')(chosen))
          }
        } finally {
          rl.close()
        }
        console.log()
        continue
      }

      if (cmd === '/help') { console.log(renderSlashMenu()); continue }

      logger.warn(`Unknown command: ${cmd}. Type / to see commands.`)
      continue
    }

    let reply = ''
    try {
      const { cleanPrompt, systemContext, warnings } = buildContext(input, cfg)
      for (const w of warnings) logger.warn(w)

      if (!sessionMeta.firstPrompt) {
        sessionMeta.firstPrompt = cleanPrompt.slice(0, 120)
      }
      sessionMeta.turns += 1

      const { tier } = classifyTier(input)
      const client = fleetClient
        ? fleetClient.withTier(tier).withModel(session.modelOverride ?? '')
        : createModelClient(cfg, tier, session.modelOverride)

      const systemPrompt =
        session.mode === 'plan' ? SYSTEM_PLAN : session.mode === 'god' ? SYSTEM_GOD : SYSTEM_BASE
      const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }]
      if (systemContext) messages.push({ role: 'system', content: systemContext })
      const trimmedHistory = session.history.slice(-(MAX_HISTORY_PAIRS * 2))
      messages.push(...trimmedHistory)
      messages.push({ role: 'user', content: cleanPrompt })

      const modeTag =
        session.mode === 'plan'
          ? chalk.hex('#7A8A5C')(' ◆ plan')
          : session.mode === 'god'
            ? chalk.hex('#E0A83C')(' ⚡ god')
            : ''
      const autoLabel = cfg.fleet?.length ? `fleet/${tier}` : cfg.model.name
      const label = modelLabel(session.modelOverride, autoLabel)
      const spinner = cfg.ui.spinner
        ? ora({
            text: `Thinking…${modeTag} ${chalk.dim('[')}${label}${chalk.dim(']')}`,
            color: 'yellow',
            // CRITICAL: ora pauses stdin by default (discardStdin), which under
            // readline's terminal mode makes the interface emit 'close' and the
            // whole REPL exits after one answer. Keep stdin owned by readline.
            discardStdin: false,
          }).start()
        : null

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
      } finally {
        if (spinner) spinner.stop()
      }

      if (reply) {
        addToHistory(session, 'user', cleanPrompt)
        addToHistory(session, 'assistant', reply)
      }
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err))
      console.log()
      continue
    }

    console.log()
  }
}
