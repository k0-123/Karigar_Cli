/**
 * Lightweight session persistence — one JSON file per REPL session under
 * `~/.karigar/sessions/`. Powers the dashboard's "Recent Sessions" panel.
 *
 * All operations are best-effort and never throw: a missing/corrupt sessions
 * directory just yields an empty list. The store is pruned to a small cap so it
 * can't grow unbounded.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { karigarHome } from '../utils/config'

export interface SessionMeta {
  id: string
  startedAt: number
  endedAt?: number
  model: string
  turns: number
  firstPrompt?: string
  cwd: string
}

const MAX_SESSIONS = 50

export function sessionsDir(): string {
  return join(karigarHome(), 'sessions')
}

function sessionPath(id: string): string {
  return join(sessionsDir(), `${id}.json`)
}

/** Create a new session record on disk and return its metadata handle. */
export function recordSessionStart(model: string, startedAt: number): SessionMeta {
  const meta: SessionMeta = {
    id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt,
    model,
    turns: 0,
    cwd: process.cwd(),
  }
  try {
    mkdirSync(sessionsDir(), { recursive: true })
    writeFileSync(sessionPath(meta.id), JSON.stringify(meta, null, 2), 'utf8')
    prune()
  } catch {
    /* best-effort */
  }
  return meta
}

/** Persist final turn count / first prompt / end time for a session. */
export function recordSessionEnd(meta: SessionMeta, endedAt: number): void {
  meta.endedAt = endedAt
  try {
    writeFileSync(sessionPath(meta.id), JSON.stringify(meta, null, 2), 'utf8')
  } catch {
    /* best-effort */
  }
}

/** Read recent sessions, newest first, capped at `limit`. */
export function listRecentSessions(limit = 5): SessionMeta[] {
  const dir = sessionsDir()
  if (!existsSync(dir)) return []
  try {
    const metas: SessionMeta[] = []
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      try {
        const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8'))
        if (typeof parsed?.startedAt !== 'number') continue
        metas.push(parsed as SessionMeta)
      } catch {
        /* skip corrupt */
      }
    }
    return metas.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit)
  } catch {
    return []
  }
}

/** Delete oldest sessions beyond MAX_SESSIONS. */
function prune(): void {
  try {
    const dir = sessionsDir()
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: Number(f.split('-')[0]) || 0 }))
      .sort((a, b) => b.t - a.t)
    for (const { f } of files.slice(MAX_SESSIONS)) {
      try {
        unlinkSync(join(dir, f))
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Human-friendly relative time for a past timestamp. Note: avoids Date.now()
 * not being available in restricted contexts by taking `now` optionally.
 */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const dayMs = 86_400_000
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  if (ts >= startOfToday) return `today ${hh}:${mm}`
  if (ts >= startOfToday - dayMs) return `yesterday ${hh}:${mm}`
  const days = Math.floor((startOfToday - ts) / dayMs) + 1
  return `${days}d ago`
}
