 # Karigar

> Free. Self-hosted. Terminal-first AI coding agent.

Karigar is a TypeScript-powered CLI coding assistant built for developers who want AI help without subscriptions, API keys, or vendor lock-in.

Inspired by Pi's minimal architecture, Karigar keeps the core small and extends functionality through skills, workflows, and model providers.

---

## Why Karigar?

Most coding assistants require:

- Monthly subscriptions
- Credit cards
- API keys
- Cloud dependency

Karigar does not.

```bash
npm install -g karigar
```

Connect once:

```bash
karigar connect https://your-server.com
```

Start coding:

```bash
karigar chat
karigar explain
karigar fix
karigar test
karigar refactor
```

---

## What Makes Karigar Different?

| Feature | Karigar | Claude Code | Cursor | Aider |
|----------|----------|----------|----------|----------|
| Terminal First | ✅ | ✅ | ❌ | ✅ |
| Self Hosted | ✅ | ❌ | ❌ | Partial |
| No API Keys Required | ✅ | ❌ | ❌ | ❌ |
| Offline Capable | ✅ | ❌ | ❌ | Partial |
| Free Forever Path | ✅ | ❌ | ❌ | ❌ |
| Custom Skills | ✅ | ❌ | ❌ | ❌ |
| Open Architecture | ✅ | ❌ | ❌ | ✅ |

---

## Core Philosophy

Karigar follows a simple rule:

> Own your workflow.

Your models.

Your server.

Your skills.

Your configuration.

Your infrastructure.

Nothing is locked behind a company account.

---

## Features

### Context Engine

Bring code context directly into conversations.

```bash
@file src/auth.ts
@diff
@selection
```

Examples:

```bash
karigar explain @file src/server.ts
```

```bash
karigar fix @diff
```

```bash
karigar refactor @selection
```

---

### Streaming Terminal Experience

Responses stream live.

```text
Analyzing...
Reading file...
Found issue in authentication flow...

Suggested fix:
```

No waiting for full responses.

---

### Smart Task Routing

Karigar automatically classifies tasks.

| Tier | Purpose |
|--------|--------|
| Fast | Quick answers |
| Medium | Functions and fixes |
| Complex | Refactors and debugging |
| Agent | Multi-step workflows |

---

### Built-in Workflows

```bash
karigar chat
karigar explain
karigar fix
karigar test
karigar review
karigar refactor
```

---

### Skill System

Install reusable capabilities.

```bash
karigar install react
```

```bash
karigar install nextjs
```

```bash
karigar install python
```

Future:

```bash
karigar install laravel
karigar install rust
karigar install docker
```

---

## Architecture

```text
User
 │
 ▼
Karigar CLI
 │
 ▼
Context Engine
(@file @diff @selection)
 │
 ▼
Task Classifier
 │
 ▼
Router
 │
 ▼
Model Provider
 │
 ├── Ollama
 ├── Oracle Cloud
 ├── Lightning AI
 ├── Kaggle
 └── Custom Providers
 │
 ▼
Streaming Response
```

---

## Example

Explain code:

```bash
karigar explain @file src/auth.ts
```

Fix bugs:

```bash
karigar fix @diff
```

Generate tests:

```bash
karigar test @file src/api.ts
```

Refactor:

```bash
karigar refactor @file src/database.ts
```

---

## Installation

### Requirements

- Node.js 20+
- Git
- Ollama (optional)

### Install

```bash
npm install -g karigar
```

Verify:

```bash
karigar --version
```

---

## Quick Start

Initialize:

```bash
karigar init
```

Chat:

```bash
karigar chat
```

Connect server:

```bash
karigar connect https://your-server.com
```

---

## Roadmap

### Phase 1

- CLI foundation
- REPL
- Configuration

### Phase 2

- Context engine
- @file
- @diff
- @selection

### Phase 3

- Ollama integration
- Streaming

### Phase 4

- Backend API

### Phase 5

- Remote deployment

### Phase 6

- Multi-provider routing

### Phase 7

- Skill ecosystem
- Package manager

---

## Vision

Karigar is not trying to be Cursor.

Karigar is not trying to be Claude Code.

Karigar exists for developers who want:

- Full ownership
- Terminal-first workflows
- Open architecture
- Self-hosting
- A free path that lasts

---

## License

MIT

---

## Status

🚧 Early Development

Karigar is currently under active development.

The goal is simple:

Build the best free terminal coding assistant possible.
