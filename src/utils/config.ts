import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { defaultConfig } from '../config/defaults'
import type { KarigarConfig, PartialKarigarConfig } from '../config/types'

/**
 * Resolve Karigar's home directory. Honors the `KARIGAR_HOME` env var so tests
 * (and power users) can isolate config from `~/.karigar`.
 */
export function karigarHome(): string {
  return process.env.KARIGAR_HOME ?? join(homedir(), '.karigar')
}

export function configPath(): string {
  return join(karigarHome(), 'config.json')
}

export function isFirstRun(): boolean {
  return !existsSync(configPath())
}

/**
 * Create the home directory and seed a default config.json if none exists.
 * Idempotent: returns `created: false` when a config is already present.
 */
export function ensureFirstRun(): { created: boolean; path: string } {
  const path = configPath()
  if (existsSync(path)) return { created: false, path }
  mkdirSync(karigarHome(), { recursive: true })
  writeFileSync(path, JSON.stringify(defaultConfig, null, 2) + '\n', 'utf8')
  return { created: true, path }
}

/** Recursively merge `override` onto `base`, returning a new object. */
function deepMerge<T>(base: T, override: unknown): T {
  if (override == null || typeof override !== 'object') return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = out[key]
    out[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object'
        ? deepMerge(current, value)
        : value
  }
  return out as T
}

/**
 * Load the effective configuration: defaults <- config.json <- runtime overrides.
 * Never throws on a malformed config file; falls back to defaults instead.
 */
export function loadConfig(overrides?: PartialKarigarConfig): KarigarConfig {
  let fileConfig: PartialKarigarConfig = {}
  const path = configPath()
  if (existsSync(path)) {
    try {
      fileConfig = JSON.parse(readFileSync(path, 'utf8')) as PartialKarigarConfig
    } catch {
      // Corrupt or partially-written config — ignore and use defaults.
      fileConfig = {}
    }
  }
  return deepMerge(deepMerge(defaultConfig, fileConfig), overrides ?? {})
}
