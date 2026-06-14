import { execSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'

const DEFAULT_TIMEOUT_MS = 30_000

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(chalk.yellow(`${question} [y/N] `))
    return answer.trim().toLowerCase() === 'y'
  } finally {
    rl.close()
  }
}

export async function runWithConfirm(
  command: string,
  opts?: { cwd?: string; timeoutMs?: number },
): Promise<RunResult | null> {
  const agreed = await confirm(`Run: ${chalk.cyan(command)}?`)
  if (!agreed) {
    console.log(chalk.dim('Skipped.'))
    return null
  }

  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      cwd: opts?.cwd ?? process.cwd(),
      timeout: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      stdio: ['inherit', 'pipe', 'pipe'],
    })
    console.log(chalk.green('✔ Exited 0'))
    if (stdout) console.log(stdout)
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number; message?: string }
    const stdout = e.stdout ?? ''
    const stderr = e.stderr ?? ''
    const exitCode = e.status ?? 1
    console.error(chalk.red(`✖ Exited ${exitCode}`))
    if (stdout) console.log(stdout)
    if (stderr) console.error(chalk.dim(stderr))
    return { stdout, stderr, exitCode }
  }
}
