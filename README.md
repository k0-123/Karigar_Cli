# Karigar 🛠️

**Code ko banao aasaan** — A free, open-source, privacy-first CLI coding assistant.

Run powerful AI models locally or on your own GPU servers. **No cloud. No tracking. No bills. Just code.**

---

## What is Karigar?

Karigar is a **terminal-native coding assistant** that runs completely under your control:

- **Ask questions** about code
- **Generate code** from descriptions
- **Fix bugs** automatically
- **Write tests** and refactor code
- **Explain** any file or snippet

Everything runs on **your machine** with models you control. Your code never leaves your computer.

```bash
# Ask a question
karigar ask "how do I parse JSON in Python?"

# Generate code
karigar code "write a REST API handler"

# Fix a bug
karigar fix src/app.ts

# Write tests
karigar test src/utils.ts

# Interactive REPL
karigar
```

---

## Why Karigar?

### 🔒 **100% Private**
- **No cloud.** All code stays on your machine.
- **No telemetry.** No tracking, no analytics, no data collection.
- **No account.** No login, no API keys to your cloud provider.
- **No bills.** Use free local models or your own GPU — your choice.

### ⚡ **Fast & Offline**
- **Instant responses.** Run models locally (1-14B parameters).
- **Works offline.** Once models are downloaded, no internet needed.
- **Full control.** Modify models, add custom instructions, fork the code.

### 🎯 **Built for Developers**
- **Pure terminal.** No web UI, no bloat. Just stdin/stdout.
- **Scriptable.** Pipe commands, automate workflows, integrate into build systems.
- **Git-aware.** Automatically includes diffs, staged changes, file context.
- **Multiple models.** Route simple questions to fast models, complex tasks to powerful ones.

---

## Get Started (5 Minutes)

### Step 1: Install Karigar

```bash
# Clone the repo
git clone https://github.com/yourusername/karigar.git
cd karigar

# Install dependencies
npm install

# Build
npm run build
```

### Step 2: Install a Local Model (Optional)

If you want **completely offline, zero-cost** operation, install [Ollama](https://ollama.ai):

```bash
# Download Ollama from https://ollama.ai
# Then pull a model:

ollama pull deepseek-r1:1.5b    # Fast model (~1.2GB)
ollama pull qwen2.5-coder:14b   # Powerful model (~9GB)

# Ollama starts automatically on http://localhost:11434
```

### Step 3: Start Using Karigar

```bash
# Interactive mode (REPL)
npm run dev

# Or single command
npm run dev ask "explain async/await in JavaScript"

# Write code directly to a file
npm run dev write "hello.js" "create a hello world function"
```

---

## Usage Examples

### Ask Questions
```bash
karigar ask "what's the difference between let and const?"
karigar ask "how do I handle errors in Node.js?"
```

### Generate Code
```bash
karigar code "write a function to reverse a string in Python"
karigar code "create a React hook for fetching data"
```

### Fix Code (requires file path)
```bash
karigar fix src/app.ts      # Auto-fix bugs
karigar fix src/            # Fix entire directory
```

### Explain Code
```bash
karigar explain src/utils.ts   # Explain a file
```

### Write & Refactor
```bash
karigar test src/math.ts       # Generate tests
karigar refactor src/api.ts    # Improve code quality
```

### Interactive Mode
```bash
karigar       # Start REPL

# In REPL, type commands like:
ask How do I use promises?
/model        # Switch models
/plan         # Enable plan mode
/god          # Enable god mode (max autonomy)
/clear        # Clear history
/help         # Show all commands
/exit         # Quit
```

---

## Tier-Based Model Routing

Karigar automatically picks the right model for your task:

| Request Type | Model | Why |
|---|---|---|
| Greetings, quick Qs | **deepseek-r1:1.5b** (fast) | Small, instant response |
| Code generation, fixes | **qwen2.5-coder:14b** (powerful) | Better at complex tasks |

You can also manually pick a model with `/model` in the REPL or `npm run dev write --model deepseek-r1:1.5b`.

---

## Configure Karigar

On first run, Karigar creates `~/.karigar/config.json`:

```json
{
  "model": {
    "provider": "ollama",
    "name": "qwen2.5-coder:14b",
    "baseUrl": "http://localhost:11434",
    "temperature": 0.2,
    "maxTokens": 2048
  },
  "context": {
    "maxFiles": 20,
    "includeGitDiff": true
  },
  "ui": {
    "color": true,
    "spinner": true,
    "streaming": true,
    "theme": "artisan",
    "dashboard": true
  },
  "fleet": []
}
```

**Key settings:**
- `provider`: `"ollama"` (local) or `"remote"` (ngrok URL)
- `name`: Model to use (e.g. `qwen2.5-coder:14b`)
- `baseUrl`: Where your model runs
- `includeGitDiff`: Automatically include staged changes
- `fleet`: Array of remote GPU servers (optional)

---

## Advanced: Use Multiple GPU Servers

Want to offload to Colab, Kaggle, or your own server? Configure a fleet:

```bash
# Add a remote GPU node
karigar fleet add colab https://your-ngrok-url

# Add another
karigar fleet add kaggle https://another-ngrok-url

# List nodes
karigar fleet list

# Remove a node
karigar fleet remove colab
```

Karigar will health-check all nodes and route requests to the fastest available one.

---

## Privacy & Security

### What Karigar Does NOT Do
- ❌ Send your code to the cloud
- ❌ Store your conversations
- ❌ Track your usage
- ❌ Collect any data
- ❌ Require authentication

### How Privacy is Protected
- ✅ All processing happens on your machine (or your own servers)
- ✅ Config file lives in your home directory (`~/.karigar/`)
- ✅ No telemetry, analytics, or external calls
- ✅ Open-source — audit the code yourself
- ✅ Default to safe system prompts (no prompt injection)

---

## Development

### Run Tests
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### Build from Source
```bash
npm run build         # Compile TypeScript → dist/index.js
npm run dev           # Run directly from src/ (no build)
```

### Project Structure
```
karigar/
├─ src/
│  ├─ index.ts              # Entry point
│  ├─ cli.ts                # Command-line interface
│  ├─ commands/             # Individual commands (ask, code, fix, etc.)
│  ├─ model/                # Model providers (Ollama, remote, fleet routing)
│  ├─ classifier/           # Tier classification (fast/medium/complex)
│  ├─ repl/                 # Interactive REPL loop
│  ├─ context/              # File/diff context assembly
│  ├─ prompts/              # System prompts & instructions
│  └─ config/               # Configuration loading
├─ tests/                   # Test suite (vitest)
├─ karigar.config.ts        # Config template
├─ tsup.config.ts           # Build configuration
└─ package.json
```

---

## Tech Stack

| Tool | Purpose |
|---|---|
| **Node.js** | Runtime (v18+) |
| **TypeScript** | Type safety, clean code |
| **Commander** | CLI argument parsing |
| **Ollama** | Local model serving |
| **Chalk** | Terminal colors |
| **Ora** | Loading spinners |
| **Vitest** | Testing framework |

---

## Roadmap

- [x] **Phase 1-7** — REPL, tier classification, fleet routing, system prompts
- [ ] **Phase 8** — VS Code extension
- [ ] **Phase 9** — Web UI (optional, fully local)
- [ ] **Phase 10** — Fine-tuned models for Karigar-specific tasks

---

## Contributing

Karigar is open-source. Contributions welcome:

1. **Fork** the repo
2. **Create a branch** (`git checkout -b feature/my-feature`)
3. **Make changes** and test (`npm test`)
4. **Commit** (`git commit -m "feat: add my feature"`)
5. **Push** and open a **Pull Request**

---

## License

MIT — Use freely, modify, redistribute. See [LICENSE](./LICENSE).

---

## Questions?

- 📖 Check the [CLAUDE.md](./CLAUDE.md) for architecture details
- 🐛 Found a bug? Open an [issue](https://github.com/yourusername/karigar/issues)
- 💬 Have ideas? Start a [discussion](https://github.com/yourusername/karigar/discussions)

---

**Karigar: Code ko banao aasaan** 🛠️

Made with ❤️ in India. Open-source. Privacy-first. Yours to control.
