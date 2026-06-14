import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Prepend a shebang so the built bundle is directly executable as `karigar`.
  banner: { js: '#!/usr/bin/env node' },
})
