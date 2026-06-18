import type { Interface } from 'node:readline/promises'
import chalk from 'chalk'
import type { KarigarConfig } from '../config/types'

interface OllamaTag {
  name: string
  size: number
}

/** Query all fleet nodes (or local Ollama) for the list of installed models. */
async function listModels(cfg: KarigarConfig): Promise<string[]> {
  const nodes = cfg.fleet?.length
    ? cfg.fleet
    : [{ baseUrl: cfg.model.baseUrl ?? 'http://localhost:11434' }]

  const results = await Promise.all(
    nodes.map(async node => {
      try {
        const res = await fetch(`${node.baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(5_000),
          headers: { 'ngrok-skip-browser-warning': 'true' },
        })
        if (!res.ok) return []
        const data = (await res.json()) as { models?: OllamaTag[] }
        return (data.models ?? []).map(m => m.name)
      } catch {
        return []
      }
    })
  )

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const merged: string[] = []
  for (const list of results) {
    for (const name of list) {
      if (!seen.has(name)) { seen.add(name); merged.push(name) }
    }
  }
  return merged
}

/**
 * Interactive `/model` picker. Lists installed models, lets the user pick one by
 * number (or type `auto` to return to tier-based selection). Returns the chosen
 * model name, `null` for auto, or `undefined` if the user cancelled.
 */
export async function pickModel(
  cfg: KarigarConfig,
  rl: Interface,
  current: string | null,
): Promise<string | null | undefined> {
  const models = await listModels(cfg)

  if (models.length === 0) {
    console.log(chalk.yellow('  Could not reach any node to list models. Is your GPU session up?'))
    return undefined
  }

  console.log('')
  console.log(chalk.bold('  Available models:'))
  console.log('  ' + chalk.dim('0') + '  ' + chalk.cyan('auto') + chalk.dim('  (pick by request tier — default)'))
  models.forEach((m, i) => {
    const marker = m === current ? chalk.green(' ●') : '  '
    console.log('  ' + chalk.dim(String(i + 1)) + '  ' + m + marker)
  })
  console.log('')

  const answer = (await rl.question(chalk.dim('  Pick a number (Enter to cancel): '))).trim()
  if (!answer) return undefined

  if (answer === '0' || answer.toLowerCase() === 'auto') return null

  const idx = parseInt(answer, 10) - 1
  if (Number.isNaN(idx) || idx < 0 || idx >= models.length) {
    console.log(chalk.yellow('  Invalid choice — keeping current model.'))
    return undefined
  }

  return models[idx]
}
