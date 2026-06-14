import chalk from 'chalk'

/**
 * Tiny logging facade over chalk. Centralizing this keeps color usage consistent
 * and gives us a single seam to respect `ui.color` / quiet modes later.
 */
export const logger = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(chalk.green(msg)),
  warn: (msg: string) => console.warn(chalk.yellow(msg)),
  error: (msg: string) => console.error(chalk.red(msg)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  brand: (msg: string) => console.log(chalk.cyan.bold(msg)),
}
