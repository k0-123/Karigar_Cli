import { parseDirectives, stripDirectives } from './directives'
import { readFile, readDir } from './files'
import { getGitDiff } from './git'
import type { KarigarConfig } from '../config/types'

const MAX_DIFF_BYTES = 32_000

export interface ContextBlock {
  label: string
  content: string
}

export interface AssembledContext {
  /** Clean prompt with @directives removed */
  cleanPrompt: string
  blocks: ContextBlock[]
  /** Full system context string to prepend to model messages */
  systemContext: string
  warnings: string[]
}

export function buildContext(prompt: string, config: KarigarConfig): AssembledContext {
  const directives = parseDirectives(prompt)
  const cleanPrompt = stripDirectives(prompt)
  const blocks: ContextBlock[] = []
  const warnings: string[] = []
  let fileCount = 0

  for (const directive of directives) {
    if (directive.kind === 'file') {
      if (!directive.arg) { warnings.push('@file requires a path argument'); continue }
      if (fileCount >= config.context.maxFiles) {
        warnings.push(`Skipped ${directive.arg} — maxFiles limit (${config.context.maxFiles}) reached`)
        continue
      }
      const result = readFile(directive.arg)
      if (!result) { warnings.push(`Could not read file: ${directive.arg}`); continue }
      if (result.truncated) warnings.push(`${result.path} was truncated (>32KB)`)
      blocks.push({ label: `File: ${result.path}`, content: result.content })
      fileCount++
    }

    if (directive.kind === 'dir') {
      if (!directive.arg) { warnings.push('@dir requires a path argument'); continue }
      const remaining = config.context.maxFiles - fileCount
      if (remaining <= 0) { warnings.push('Skipped @dir — maxFiles limit reached'); continue }
      const { included, skipped } = readDir(directive.arg, remaining)
      for (const f of included) {
        blocks.push({ label: `File: ${f.path}`, content: f.content })
        fileCount++
      }
      if (skipped.length) warnings.push(`Skipped ${skipped.length} binary/unreadable file(s) in ${directive.arg}`)
    }

    if (directive.kind === 'diff') {
      if (!config.context.includeGitDiff) { warnings.push('@diff ignored — includeGitDiff is false in config'); continue }
      const { diff, available } = getGitDiff()
      if (!available) { warnings.push('No git repository found for @diff'); continue }
      if (!diff) { warnings.push('@diff: no changes detected'); continue }
      let diffContent = diff
      if (Buffer.byteLength(diff, 'utf8') > MAX_DIFF_BYTES) {
        diffContent = diff.slice(0, MAX_DIFF_BYTES) + '\n… [diff truncated at 32KB]'
        warnings.push('@diff was truncated (>32KB). Consider staging fewer files.')
      }
      blocks.push({ label: 'Git diff (staged + unstaged)', content: diffContent })
    }

    if (directive.kind === 'selection') {
      // Selection is passed as stdin or via future --selection flag (Phase 4 REPL)
      const sel = process.env.KARIGAR_SELECTION
      if (!sel) { warnings.push('@selection: no selection provided (set KARIGAR_SELECTION env var)'); continue }
      blocks.push({ label: 'Selection', content: sel })
    }
  }

  const systemContext = blocks.length
    ? blocks.map(b => `=== ${b.label} ===\n${b.content}`).join('\n\n')
    : ''

  return { cleanPrompt, blocks, systemContext, warnings }
}
