# Karigar 🛠️

A minimal, terminal-native, streaming CLI coding assistant. No GUI, no web dashboard — just a fast, scriptable command-line tool that talks to free/local models (Ollama + Qwen 2.5 Coder to start).

> **Status:** Phase 1 — CLI Core Foundation. The harness, config, and first-run flow are in place. Model integration lands in Phase 3.

## Tech stack

| Concern       | Choice                                                                              | Why                                                               |
| ------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Runtime       | Node.js ≥ 18                                                                        | Ubiquitous, native `fetch`/streams for later phases.              |
| Language      | TypeScript (ESM)                                                                    | Type-safe core; extensible via TS modules.                        |
| CLI framework | [commander](https://github.com/tj/commander.js)                                     | Tiny, zero-ceremony arg parsing — fits the small-core philosophy. |
| Build         | [tsup](https://tsup.egoist.dev)                                                     | One-command ESM bundle with auto shebang.                         |
| Dev runner    | [tsx](https://github.com/privatenumber/tsx)                                         | Run TS directly, no build step.                                   |
| Terminal UI   | [chalk](https://github.com/chalk/chalk), [ora](https://github.com/sindresorhus/ora) | Colors now; spinners reserved for streaming.                      |
| Tests         | [vitest](https://vitest.dev)                                                        | Fast, TS-native, zero config.                                     |

## Project layout

```
karigar/
├─ src/
│  ├─ index.ts            # executable entry (shebang added at build)
│  ├─ cli.ts              # builds the Commander program (testable)
│  ├─ commands/
│  │  └─ hello.ts         # `karigar hello` smoke-test command
│  ├─ utils/
│  │  ├─ config.ts        # home dir, first-run seed, config loader
│  │  └─ logger.ts        # chalk logging facade
│  └─ config/
│     ├─ types.ts         # KarigarConfig schema
│     └─ defaults.ts      # default settings
├─ karigar.config.ts      # editable config template (documents every setting)
├─ tests/
│  └─ cli.test.ts         # vitest suite
├─ tsup.config.ts
├─ tsconfig.json
└─ package.json
```

## Quick start

```bash
npm install          # install dependencies
npm run dev -- --help # run from source
npm run build         # produce dist/index.js
npm test              # run the vitest suite
```

Install globally and run the binary:

```bash
npm install -g .      # or: npm i -g karigar  once published
karigar --help
karigar hello
karigar hello World --shout
```

On first run, Karigar creates `~/.karigar/config.json` from the defaults. Override the
location with the `KARIGAR_HOME` environment variable.

## Configuration

See [`karigar.config.ts`](./karigar.config.ts) for every available setting and its
default. The runtime reads `~/.karigar/config.json`; missing fields fall back to the
built-in defaults. **Never commit real API keys** — use the local config file or env vars.

## Security note (Phase 1)

This phase runs entirely local code: no network calls, no telemetry, no secrets. The
config loader is hardened to fall back to defaults on a malformed file rather than crash.
