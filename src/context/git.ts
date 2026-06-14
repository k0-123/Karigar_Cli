import { execSync } from 'node:child_process'

export interface GitDiffResult {
  diff: string
  available: boolean
}

export function getGitDiff(): GitDiffResult {
  try {
    const staged = execSync('git diff --cached', { encoding: 'utf8', timeout: 5000 })
    const unstaged = execSync('git diff', { encoding: 'utf8', timeout: 5000 })
    const diff = [staged, unstaged].filter(Boolean).join('\n').trim()
    return { diff, available: true }
  } catch {
    return { diff: '', available: false }
  }
}
