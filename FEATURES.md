# Karigar Features

## Core Features

### 🎯 Smart Model Routing
Karigar automatically picks the right model for your task:
- **Fast model** for casual questions (deepseek-r1:1.5b)
- **Powerful model** for complex coding (qwen2.5-coder:14b)
- **Manual override** anytime with `/model` command

### 🔄 Interactive REPL
Full conversation history, multiple modes, and smart context:
- **Normal Mode** — Standard Q&A
- **Plan Mode** — Karigar outlines steps before coding
- **God Mode** — Maximum autonomy (fully implemented solutions)
- **Context awareness** — Automatically includes files, diffs, and git changes

### 📂 Intelligent Context Assembly
```bash
@file path/to/file.ts    # Include a file
@diff                     # Include git staged + unstaged changes
@selection                # Include editor selection
@dir path/to/dir         # Include entire directory
```

### 🚀 Multiple Commands

| Command | Use Case |
|---------|----------|
| `ask` | Questions, explanations, code advice |
| `code` | Generate code from scratch |
| `fix` | Find and automatically fix bugs |
| `explain` | Understand what code does |
| `test` | Generate comprehensive tests |
| `refactor` | Improve code quality & performance |
| `write` | Generate code and save directly to file |

### 🌐 Fleet Routing
Route requests across multiple GPU servers:
```bash
karigar fleet add colab https://your-ngrok-url
karigar fleet add kaggle https://another-url
```

Karigar automatically:
- Health-checks all nodes
- Routes to the fastest available
- Warns if a node goes down
- Falls back to local Ollama if needed

---

## Privacy & Security Features

### 🔒 Zero Telemetry
- No analytics
- No tracking cookies
- No data collection
- No "anonymous usage" stats

### 📡 No Cloud Dependency
- Works 100% offline
- No internet required after model download
- Your code never leaves your machine
- No data stored on remote servers

### 🛡️ Open Source
- Full source code available
- Audit everything yourself
- No hidden behavior
- MIT license

### 🔐 Configuration Privacy
- Config lives in `~/.karigar/` (your home directory)
- Never committed to git (`.gitignore` protected)
- No hardcoded API keys
- Environment variable support for secrets

---

## Advanced Features

### 🎓 Smart Prompting System
Context-aware system prompts that:
- Distinguish between greetings and code tasks
- Prevent hallucinations and false claims
- Enforce output formatting (code blocks, minimal diffs)
- Optimize for open-source models

### ⚡ Streaming Response
- Real-time token streaming (no buffering)
- Live spinner feedback
- Interrupt anytime with `Ctrl+C`
- See responses as they're generated

### 📊 Request Tier Classification
Automatic classification into:
- **Fast tier** (≤8 words, casual tone)
- **Medium tier** (8-40 words, moderate complexity)
- **Complex tier** (>40 words or complex keywords)

### 🔄 Fallback System
Graceful degradation when nodes fail:
- Fleet node down? Automatically try next-fastest
- All fleet nodes down? Fall back to local Ollama
- Local Ollama down? Show helpful error message
- User always sees what happened (no silent failures)

### 💾 Session Management
- Save conversation history
- View recent sessions
- Auto-prune old sessions (keep last 50)
- Export session metadata

### 🎨 Artisan Dashboard
Beautiful terminal UI with:
- System status display
- Model information
- Fleet node status
- Real-time spinner feedback
- Color-coded output

---

## Performance Features

### ⚙️ Efficient Health Checking
- Health checks cached (30-second TTL)
- Parallel node probing
- Doesn't block on first turn
- Zero overhead after cache warmup

### 📦 Smart History Management
- Conversation history capped (20 pairs default)
- Prevents context window overflow
- Keeps full history in memory (for export)
- Trims intelligently on each turn

### 🚀 Minimal Dependencies
- Only 3 runtime dependencies
- ~80KB minified bundle
- Loads in milliseconds
- Runs on Node.js 18+

### 💻 CPU/GPU Agnostic
- Works with CPU-only models
- Scales to 70B+ models on GPU
- Automatically detect available resources
- No forced GPU requirement

---

## Developer Features

### 🧪 Comprehensive Test Suite
- 68+ passing tests
- Unit tests for all core systems
- Integration tests for commands
- Provider fallback tested
- Config validation tested

### 📝 Type Safety
- 100% TypeScript codebase
- Strict type checking
- Self-documenting types
- IDE autocomplete support

### 🔌 Extensible Architecture
- Plugin system for custom commands
- Provider interface for new model types
- Hook system for request/response processing
- Configurable system prompts

### 📚 Well-Documented Code
- JSDoc comments on all functions
- Architecture documented in CLAUDE.md
- Config template with inline docs
- Inline comments on non-obvious logic

---

## Quality Improvements (Latest Release)

### 🐛 18 Bug Fixes
- Dead warning code removed
- JSON parse errors guarded
- Silent fallbacks now visible
- Session ID collisions fixed
- Corrupt file handling improved

### ⚡ Performance
- Fleet health checks no longer block every turn
- History capped to prevent overflow
- Spinner labels accurate (shows fleet/tier)
- Keyword matching fixed (word boundaries)

### 🛡️ Reliability
- Malformed JSON in streams handled gracefully
- @diff truncation warnings
- Multi-block code extraction warnings
- Proper tier routing for all commands

---

## Deployment Options

### 🏠 Local Only
```bash
# All processing on your laptop
ollama pull qwen2.5-coder:14b
karigar ask "your question"
```

### ☁️ With Remote GPU
```bash
# Offload to Colab/Kaggle/your server
karigar fleet add colab https://your-ngrok-url
```

### 🏭 Multi-GPU Fleet
```bash
# Route across multiple nodes
karigar fleet add colab https://url1
karigar fleet add kaggle https://url2
karigar fleet add oracle https://url3
# Karigar automatically picks the best one
```

---

## What's NOT Included

❌ Web UI (intentionally)  
❌ Cloud API (you run everything locally)  
❌ Telemetry (no tracking)  
❌ Account creation (not needed)  
❌ Paid tiers (all free)  

---

## Coming Soon

- [ ] VS Code extension
- [ ] Browser-based REPL (fully local)
- [ ] Fine-tuned models for Karigar tasks
- [ ] Streaming to files
- [ ] Bash/shell integration

---

**Karigar: Your AI assistant. On your terms. In your terminal.**
