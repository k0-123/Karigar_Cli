/**
 * Data gathering for the dashboard panels. Everything here is synchronous,
 * time-boxed, and defensively wrapped so a slow/huge repo or missing git never
 * blocks or crashes the home screen — failures degrade to safe placeholders.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'
import { listRecentSessions, relativeTime } from '../repl/sessionStore'
import type { KarigarConfig } from '../config/types'

export interface RecentSessionView {
  label: string
  when: string
}

export interface DashboardData {
  cwdLabel: string
  branch: string | null
  provider: string
  model: string
  fleetSummary: string
  fleetActive: boolean
  projectName: string
  language: string
  loc: string
  contextUsed: number
  contextTotal: number
  recentSessions: RecentSessionView[]
}

const GIT_TIMEOUT = 1500

/** Current git branch, or null when not a repo / detached / git missing. */
export function gitBranch(cwd: string): string | null {
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      timeout: GIT_TIMEOUT,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return out && out !== 'HEAD' ? out : null
  } catch {
    return null
  }
}

/** Replace a leading home directory with `~` for a compact cwd label. */
function tildeify(p: string): string {
  const home = homedir()
  return p.startsWith(home) ? '~' + p.slice(home.length).replace(/\\/g, '/') : p.replace(/\\/g, '/')
}

/** Infer the project's primary language from manifest files. */
function detectLanguage(cwd: string): string {
  if (existsSync(join(cwd, 'tsconfig.json'))) return 'TypeScript'
  if (existsSync(join(cwd, 'package.json'))) return 'JavaScript'
  if (existsSync(join(cwd, 'Cargo.toml'))) return 'Rust'
  if (existsSync(join(cwd, 'go.mod'))) return 'Go'
  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'requirements.txt'))) return 'Python'
  return '—'
}

/** Lines of code via git, with a bounded src/ walk fallback. */
function countLoc(cwd: string): string {
  try {
    const files = execSync('git ls-files', {
      cwd,
      encoding: 'utf8',
      timeout: GIT_TIMEOUT,
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 4 * 1024 * 1024,
    })
      .split('\n')
      .filter((f) => /\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|css|html)$/.test(f))
      .slice(0, 2000)

    let total = 0
    for (const f of files) {
      try {
        total += readFileSync(join(cwd, f), 'utf8').split('\n').length
      } catch {
        /* skip unreadable */
      }
    }
    return formatLoc(total)
  } catch {
    return '—'
  }
}

function formatLoc(n: number): string {
  if (n <= 0) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function recentSessionViews(): RecentSessionView[] {
  try {
    return listRecentSessions(5).map((s) => ({
      label: s.firstPrompt ? truncate(s.firstPrompt, 20) : s.model,
      when: relativeTime(s.startedAt),
    }))
  } catch {
    return []
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** Build the full dashboard data set from config + the current working dir. */
export function gatherDashboardData(cfg: KarigarConfig): DashboardData {
  const cwd = process.cwd()
  const fleetCount = cfg.fleet?.length ?? 0
  const fleetActive = fleetCount > 0

  const provider =
    cfg.model.provider === 'ollama' && /localhost|127\.0\.0\.1/.test(cfg.model.baseUrl)
      ? 'Ollama (local)'
      : cfg.model.provider === 'remote'
        ? 'Remote'
        : cfg.model.provider === 'ollama'
          ? 'Ollama'
          : 'OpenAI-compatible'

  return {
    cwdLabel: tildeify(cwd),
    branch: gitBranch(cwd),
    provider,
    model: cfg.model.name,
    fleetSummary: fleetActive
      ? `${fleetCount} GPU node${fleetCount > 1 ? 's' : ''} (${cfg.fleet.map((n) => n.provider).join(', ')})`
      : 'local',
    fleetActive,
    projectName: basename(cwd),
    language: detectLanguage(cwd),
    loc: countLoc(cwd),
    contextUsed: 0,
    contextTotal: cfg.model.maxTokens,
    recentSessions: recentSessionViews(),
  }
}
