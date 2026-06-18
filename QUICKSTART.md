# Karigar Quick Start Guide

## 60 Seconds to Your First AI-Powered Code Session

### 1. Clone & Install
```bash
git clone https://github.com/k0-123/Karigar_Cli.git
cd Karigar_Cli
npm install
npm run build
```

### 2. Set Up a Model (Choose One)

**Option A: Local Models (Recommended — Free & Private)**
```bash
# Install Ollama from https://ollama.ai
ollama pull deepseek-r1:1.5b
ollama pull qwen2.5-coder:14b
```

**Option B: Remote GPU (Colab, Kaggle, etc.)**
- Run the included Colab notebook in `server/colab_setup.py`
- Karigar auto-configures to use it

### 3. Start Coding!

```bash
# Ask a question
npm run dev ask "how do I use async/await?"

# Generate code
npm run dev code "write a REST API handler"

# Fix a bug
npm run dev fix src/app.ts

# Interactive mode
npm run dev
```

---

## Commands

| Command | What It Does |
|---------|--------------|
| `ask` | Ask a question about code |
| `code` | Generate code from a description |
| `fix` | Find and fix bugs in a file |
| `explain` | Explain a file or snippet |
| `test` | Generate tests |
| `refactor` | Improve code quality |
| `write` | Generate code and save to file |

---

## In the REPL

```bash
npm run dev    # Start interactive mode

# Then type:
ask What's the best way to handle errors?
/model         # Switch between models
/plan          # Enable plan mode (Karigar outlines steps first)
/god           # Enable god mode (max autonomy)
/clear         # Clear conversation history
/help          # Show all commands
/exit          # Quit
```

---

## Privacy Check ✅

- ✅ Your code **never leaves your computer**
- ✅ **No tracking** — we don't even know you exist
- ✅ **No accounts** — no login, no API keys to third parties
- ✅ **No cloud** — runs 100% locally
- ✅ **Open-source** — read the code yourself

---

## Troubleshooting

### "Cannot reach Ollama at http://localhost:11434"
Make sure Ollama is running:
```bash
ollama serve    # Or just open the Ollama app
```

### "No healthy fleet nodes available"
You've configured remote servers but they're offline. Check:
```bash
karigar fleet list      # See your nodes
karigar fleet remove id # Remove dead ones
```

### "Model returned unknown error"
1. Check your internet (if using remote)
2. Check model is installed: `ollama list`
3. Restart Ollama: `ollama serve`

---

## Next Steps

- 📖 Full docs: See [README.md](./README.md)
- 🔧 Configure: Edit `~/.karigar/config.json`
- 🚀 Deploy: Add remote GPU nodes with `karigar fleet add`
- 💻 Integrate: Pipe Karigar into your build pipeline

---

**Questions?** Open an issue on [GitHub](https://github.com/k0-123/Karigar_Cli/issues)

Happy coding! 🛠️
