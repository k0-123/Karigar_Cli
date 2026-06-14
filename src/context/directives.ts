export type DirectiveKind = 'file' | 'diff' | 'selection' | 'dir'

export interface Directive {
  kind: DirectiveKind
  arg?: string
  raw: string
}

const DIRECTIVE_RE = /@(file|diff|selection|dir)(?:\s+(\S+))?/g

export function parseDirectives(prompt: string): Directive[] {
  const directives: Directive[] = []
  let match: RegExpExecArray | null
  DIRECTIVE_RE.lastIndex = 0
  while ((match = DIRECTIVE_RE.exec(prompt)) !== null) {
    directives.push({
      kind: match[1] as DirectiveKind,
      arg: match[2],
      raw: match[0],
    })
  }
  return directives
}

export function stripDirectives(prompt: string): string {
  return prompt.replace(DIRECTIVE_RE, '').replace(/\s{2,}/g, ' ').trim()
}
