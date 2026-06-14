import type { Command } from 'commander'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { configPath, ensureFirstRun } from '../utils/config'
import { logger } from '../utils/logger'
import type { FleetNode, WorkerProvider } from '../config/types'

function loadFleet(): FleetNode[] {
  const path = configPath()
  if (!existsSync(path)) return []
  try {
    const cfg = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    return (cfg.fleet as FleetNode[] | undefined) ?? []
  } catch {
    return []
  }
}

function saveFleet(fleet: FleetNode[]): void {
  ensureFirstRun()
  const path = configPath()
  let cfg: Record<string, unknown> = {}
  if (existsSync(path)) {
    try { cfg = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown> } catch { /* ignore */ }
  }
  cfg.fleet = fleet
  writeFileSync(path, JSON.stringify(cfg, null, 2) + '\n', 'utf8')
}

async function checkHealth(node: FleetNode): Promise<boolean> {
  try {
    const res = await fetch(`${node.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(4_000),
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    return res.ok
  } catch {
    return false
  }
}

export function registerFleet(program: Command): void {
  const fleet = program
    .command('fleet')
    .description('Manage direct GPU worker nodes (no server middleman).')

  // karigar fleet add colab https://xyz.ngrok-free.app
  fleet
    .command('add <provider> <url>')
    .description('Add a worker node to the fleet.')
    .option('--fast-model <model>', 'model for short/fast prompts', 'deepseek-r1:1.5b')
    .option('--coding-model <model>', 'model for coding/complex prompts', 'qwen2.5-coder:14b')
    .option('--tier <tier>', 'highest tier this node handles: fast|medium|complex', 'complex')
    .action((provider: string, url: string, opts: { fastModel: string; codingModel: string; tier: string }) => {
      const validProviders: WorkerProvider[] = ['colab', 'kaggle', 'oracle-arm', 'lightning-gpu', 'lightning-cpu']
      if (!validProviders.includes(provider as WorkerProvider)) {
        logger.error(`Unknown provider "${provider}". Valid: ${validProviders.join(', ')}`)
        process.exit(1)
      }

      const nodes = loadFleet()
      const id = `${provider}-${nodes.filter(n => n.provider === provider).length + 1}`
      const node: FleetNode = {
        id,
        provider: provider as WorkerProvider,
        baseUrl: url.replace(/\/$/, ''),
        fastModel: opts.fastModel,
        codingModel: opts.codingModel,
        tier: opts.tier as FleetNode['tier'],
      }
      nodes.push(node)
      saveFleet(nodes)
      logger.success(`Added ${id} → ${node.baseUrl}`)
      logger.dim(`  Fast model:   ${node.fastModel}`)
      logger.dim(`  Coding model: ${node.codingModel}`)
      logger.dim(`  Tier: ${node.tier}`)
    })

  // karigar fleet remove <id>
  fleet
    .command('remove <id>')
    .description('Remove a worker node by ID.')
    .action((id: string) => {
      const nodes = loadFleet()
      const next = nodes.filter(n => n.id !== id)
      if (next.length === nodes.length) {
        logger.error(`No node with id "${id}".`)
        process.exit(1)
      }
      saveFleet(next)
      logger.success(`Removed ${id}`)
    })

  // karigar fleet list
  fleet
    .command('list')
    .description('List all configured fleet nodes.')
    .action(() => {
      const nodes = loadFleet()
      if (nodes.length === 0) {
        logger.warn('No fleet nodes configured.')
        logger.dim('Run: karigar fleet add colab <ngrok-url>')
        return
      }
      const col = (s: string, w: number) => s.padEnd(w)
      console.log('')
      console.log(col('ID', 16) + col('PROVIDER', 14) + col('TIER', 10) + 'URL')
      console.log('─'.repeat(70))
      for (const n of nodes) {
        console.log(col(n.id, 16) + col(n.provider, 14) + col(n.tier, 10) + n.baseUrl)
      }
      console.log('')
    })

  // karigar fleet status
  fleet
    .command('status')
    .description('Health-check all fleet nodes right now.')
    .action(async () => {
      const nodes = loadFleet()
      if (nodes.length === 0) {
        logger.warn('No fleet nodes configured.')
        return
      }

      console.log('')
      console.log('Checking fleet health…')

      const results = await Promise.all(
        nodes.map(async n => ({ node: n, healthy: await checkHealth(n) })),
      )

      const col = (s: string, w: number) => s.padEnd(w)
      console.log('')
      console.log(col('ID', 16) + col('PROVIDER', 14) + col('STATUS', 10) + 'URL')
      console.log('─'.repeat(70))
      for (const { node, healthy } of results) {
        const status = healthy ? '✓ online' : '✗ offline'
        console.log(col(node.id, 16) + col(node.provider, 14) + col(status, 10) + node.baseUrl)
      }
      console.log('')

      const online = results.filter(r => r.healthy).length
      logger.info(`${online}/${results.length} nodes online`)
    })
}
