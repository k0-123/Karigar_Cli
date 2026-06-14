import { readFileSync, statSync, readdirSync } from 'node:fs'
import { resolve, relative, extname } from 'node:path'

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.woff', '.woff2', '.ttf', '.eot',
  '.db', '.sqlite', '.lock',
])

const MAX_FILE_BYTES = 32_000

export interface FileResult {
  path: string
  content: string
  truncated: boolean
}

export interface FilesReport {
  included: FileResult[]
  skipped: string[]
}

export function readFile(filePath: string): FileResult | null {
  const abs = resolve(filePath)
  if (BINARY_EXTENSIONS.has(extname(abs).toLowerCase())) return null

  let raw: string
  try {
    raw = readFileSync(abs, 'utf8')
  } catch {
    return null
  }

  const truncated = Buffer.byteLength(raw, 'utf8') > MAX_FILE_BYTES
  const content = truncated ? raw.slice(0, MAX_FILE_BYTES) + '\n… [truncated]' : raw
  return { path: relative(process.cwd(), abs), content, truncated }
}

export function readDir(dirPath: string, maxFiles: number): FilesReport {
  const abs = resolve(dirPath)
  const included: FileResult[] = []
  const skipped: string[] = []

  function walk(dir: string): void {
    if (included.length >= maxFiles) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (included.length >= maxFiles) break
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue
      const full = `${dir}/${entry}`
      let stat
      try { stat = statSync(full) } catch { continue }
      if (stat.isDirectory()) { walk(full); continue }
      const result = readFile(full)
      if (result) included.push(result)
      else skipped.push(relative(process.cwd(), full))
    }
  }

  walk(abs)
  return { included, skipped }
}
