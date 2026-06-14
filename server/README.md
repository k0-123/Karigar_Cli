# Karigar Backend Router

The self-hosted backend that routes requests across a fleet of free GPU/CPU providers. Provides intelligent tier-based routing, health checks, and automatic fallback.

## Architecture

```
CLI sends request {messages, tier}
         ↓
    Router selects best available node:
    1. Google Colab (T4, 12-hr sessions)
    2. Kaggle (T4/P100, 30hr/week)
    3. Lightning AI GPU (80hr/month)
    4. Oracle ARM (always-on, free tier)
    5. Lightning CPU (always-on, free)
         ↓
    Node runs Ollama with model tier
         ↓
    Streams response back to CLI
```

## Quick Start (Local Testing)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Run locally with mock workers

```bash
cd server
npm install
docker-compose up -d

# Wait for services to be healthy (~30s)
# Server is now listening on http://localhost:3000
```

### Test the router

```bash
# Check health
curl http://localhost:3000/health

# Check metrics
curl http://localhost:3000/metrics

# Send a request
curl -X POST http://localhost:3000/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role": "user", "content": "hello"}],
    "tier": "fast"
  }'
```

## Production Deployment

### Step 1: Set up workers on free providers

Each provider gets a setup script.

#### Google Colab (T4 GPU, 12-hr session limit)

Open a Colab notebook and run:

```python
%run https://raw.githubusercontent.com/k0-123/Karigar_Cli/main/server/scripts/setup-colab.py
```

This will:
- Install Ollama
- Pull both models (DeepSeek 1.5B + Qwen 14B)
- Set up an ngrok tunnel for remote access
- Print the public URL

Save the URL and set `COLAB_BASEURL` in your server environment.

#### Oracle Cloud Free Tier ARM (always-on)

On your Oracle instance:

```bash
curl -fsSL https://raw.githubusercontent.com/k0-123/Karigar_Cli/main/server/scripts/setup-oracle-arm.sh | bash
```

This will:
- Install Ollama
- Pull both models (Qwen 7B + DeepSeek 7B)
- Configure systemd for auto-start
- Print the IP and port

Save the URL and set `ORACLE_BASEURL` in your server environment.

### Step 2: Deploy the server

**Option A: Docker (recommended)**

```bash
docker build -t karigar-server .
docker run -d \
  -p 3000:3000 \
  -e COLAB_BASEURL="https://your-colab-ngrok-url" \
  -e KAGGLE_BASEURL="http://your-kaggle-instance:11434" \
  -e ORACLE_BASEURL="http://your-oracle-ip:11434" \
  karigar-server
```

**Option B: Render (free tier)**

1. Fork this repo
2. Create a new Web Service on Render
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`
5. Add environment variables (COLAB_BASEURL, ORACLE_BASEURL, etc.)
6. Deploy

**Option C: Railway (free tier)**

Same as Render — just create a new project, connect your GitHub repo, and set env vars.

### Step 3: Connect your Karigar CLI

```bash
karigar connect https://your-server.example.com
```

The CLI will now:
- Send requests to your server
- Auto-classify by tier
- Route to the healthiest node
- Fall back to local Ollama if all remote nodes fail

## Configuration

Environment variables (set on your server):

```bash
PORT=3000                                          # Server port
HOST=0.0.0.0                                       # Listen address
COLAB_BASEURL=https://your-colab-ngrok-url       # Colab worker
KAGGLE_BASEURL=http://your-kaggle-ip:11434       # Kaggle worker
ORACLE_BASEURL=http://your-oracle-ip:11434       # Oracle ARM worker
LIGHTNING_GPU_BASEURL=http://lightning-ip:11434  # Lightning GPU worker
LIGHTNING_CPU_BASEURL=http://lightning-cpu:11434 # Lightning CPU worker
AUTH_TOKEN=your-secret-token                      # (optional) require this token from CLI
```

## API

### POST /v1/chat

Request body:
```json
{
  "messages": [
    {"role": "user", "content": "..."}
  ],
  "tier": "fast|medium|complex",
  "temperature": 0.2,
  "maxTokens": 2048
}
```

Response (NDJSON stream):
```
{"text": "Hello", "done": false}
{"text": " world", "done": false}
{"text": "!", "done": true}
```

### GET /health

Returns health status of all nodes.

### GET /metrics

Returns performance metrics per node.

## Capacity

At 8 hours/day usage:

| Provider | GPU/CPU | Monthly Hours | Model Split |
|----------|---------|-------|--|
| Colab | T4 16GB | 240 | DeepSeek 1.5B + Qwen 14B |
| Kaggle | T4 16GB | ~215 | DeepSeek 1.5B + Qwen 14B |
| Oracle ARM | 24GB RAM | ∞ | Qwen 7B + DeepSeek 7B |
| **Total available** | - | **455/month** | - |

**Needed:** ~240/month → **99.99% success rate** with automatic fallback.

## Monitoring

Check server health:
```bash
curl https://your-server.example.com/health

# Response:
{
  "status": "ok",
  "healthy": 4,
  "total": 5,
  "nodes": [
    {"id": "colab-1", "healthy": true},
    {"id": "oracle-arm", "healthy": true},
    ...
  ]
}
```

## Troubleshooting

**No healthy nodes available**
- Check that at least one worker is up and Ollama is running
- Run `/health` to see which nodes are down
- Workers auto-recover from transient failures

**Requests timing out**
- Increase `REQUEST_TIMEOUT_MS` in `src/dispatch.ts` (default 120s)
- Complex tasks on CPU can take 40+ seconds
- Check worker logs for any model loading errors

**Models not loaded**
- Run the worker setup script again
- Check `ollama list` on the worker to confirm models are present
- Check disk space (each quantized model is 1–9GB)

## License

MIT
