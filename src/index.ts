import { createProgram } from './cli'
import { ensureFirstRun, isFirstRun } from './utils/config'
import { logger } from './utils/logger'

/**
 * Executable entry point for the `karigar` binary.
 * Runs the first-run setup flow, then dispatches to Commander.
 */
async function main(): Promise<void> {
  if (isFirstRun()) {
    const { path } = ensureFirstRun()
    logger.brand('Welcome to Karigar 🛠️')
    logger.dim(`Created default config at ${path}`)
    logger.dim('Run `karigar --help` to see available commands.\n')
  }

  const program = createProgram()
  await program.parseAsync(process.argv)
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
