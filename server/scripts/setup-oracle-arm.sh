#!/bin/bash
# Setup script for Oracle Cloud Free Tier ARM instance (always-on)
# Run this once on your Oracle Cloud Compute instance

set -e

echo "=== Karigar Worker Setup: Oracle Cloud ARM ==="
echo "This instance will run both Qwen2.5-Coder 7B and DeepSeek R1 7B"
echo "Total VRAM: ~10GB of 24GB RAM"

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama in background
sudo systemctl start ollama
sudo systemctl enable ollama

# Pull models (runs for ~20-30 min each)
echo "Pulling Qwen2.5-Coder 7B (quantized to 4-bit)..."
ollama pull qwen2.5-coder:7b-q4

echo "Pulling DeepSeek R1 7B (quantized to 4-bit)..."
ollama pull deepseek-r1:7b-q4

# Create a systemd service to expose Ollama on 0.0.0.0:11434
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ollama
ExecStart=/usr/bin/ollama serve
Restart=always
RestartSec=5s
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=-1"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama

echo "✓ Oracle ARM worker ready"
echo "  URL: http://<your-oracle-ip>:11434"
echo "  Set environment variable: ORACLE_BASEURL=http://<your-oracle-ip>:11434"
