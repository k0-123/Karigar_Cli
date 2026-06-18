import type { Command } from 'commander'
import ora from 'ora'
import { loadConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { createModelClient } from '../model/client'
import { buildContext } from '../context/assemble'
import { classifyTier } from '../classifier/tier'
import { SYSTEM_BASE } from '../prompts/templates'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export function registerWrite(program: Command): void {
  program
    .command('write <filepath> <prompt>')
    .description('Generate code/content and save directly to a file.')
    .action(async (filepath: string, prompt: string) => {
      const cfg = loadConfig()
      const { tier } = classifyTier(prompt)
      const client = createModelClient(cfg, tier)

      const { cleanPrompt, systemContext, warnings } = buildContext(prompt, cfg)

      for (const w of warnings) logger.warn(w)

      const messages: { role: 'system' | 'user'; content: string }[] = [
        { role: 'system', content: SYSTEM_BASE },
      ]
      if (systemContext) messages.push({ role: 'system', content: systemContext })
      messages.push({ role: 'user', content: cleanPrompt })

      const spinner = cfg.ui.spinner ? ora({ text: `Generating ${filepath}…`, color: 'cyan' }).start() : null

      try {
        let response = ''
        for await (const token of client.chat({ messages })) {
          response += token.text
          if (token.done) break
        }

        // Extract code from markdown blocks if present
        const allBlocks = [...response.matchAll(/```(?:\w+)?\n([\s\S]*?)\n```/g)]
        const content = allBlocks.length > 0 ? allBlocks[0][1] : response

        if (spinner) spinner.stop()

        if (allBlocks.length > 1) {
          logger.warn(`Model returned ${allBlocks.length} code blocks — only the first was written to ${filepath}. Run with a more specific prompt to get a single block.`)
        }

        // Create directory if needed
        const dir = dirname(filepath)
        if (dir !== '.') {
          mkdirSync(dir, { recursive: true })
        }

        // Write file
        writeFileSync(filepath, content, 'utf-8')

        logger.dim(`\n✓ File created: ${filepath}`)
        logger.dim(`  Size: ${content.length} bytes`)
      } catch (err) {
        if (spinner) spinner.stop()
        logger.error(err instanceof Error ? err.message : String(err))
        process.exit(1)
      }
    })
}
