# Karigar Worker Setup for Google Colab
# Run this entire script in a single Colab cell
# Runtime > Change runtime type > T4 GPU before running

import subprocess
import os
import time

print("=== Karigar Worker Setup: Google Colab ===")

# Check GPU
gpu_output = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
if gpu_output.returncode == 0:
    print("✓ GPU detected")
else:
    print("✗ No GPU found — go to Runtime > Change runtime type > T4 GPU")

# Install Ollama
print("\nInstalling Ollama...")
subprocess.run(['apt-get', 'update', '-qq'], capture_output=True)
subprocess.run(['apt-get', 'install', '-y', '-qq', 'curl'], capture_output=True)
result = subprocess.run(['bash', '-c', 'curl -fsSL https://ollama.ai/install.sh | sh'], capture_output=True)
if result.returncode == 0:
    print("✓ Ollama installed")
else:
    print("✗ Ollama install failed:", result.stderr.decode())

# Start Ollama — bind to 0.0.0.0 so ngrok can reach it (default 127.0.0.1
# refuses ngrok's IPv6/loopback dial and yields ERR_NGROK_8012).
print("Starting Ollama server...")
os.system('OLLAMA_HOST=0.0.0.0:11434 nohup ollama serve > /tmp/ollama.log 2>&1 &')
time.sleep(5)
print("✓ Ollama started")

# Pull models. Note: the plain :14b / :1.5b tags are already q4_K_M quantized;
# the older `-q4` suffixes are NOT valid tags and fail silently under os.system.
print("\nPulling DeepSeek R1 1.5B (~1.2GB, fast model)...")
os.system('ollama pull deepseek-r1:1.5b')

print("\nPulling Qwen2.5-Coder 14B (~9GB, code model, takes ~10 min)...")
os.system('ollama pull qwen2.5-coder:14b')

# Verify the models actually landed before claiming success.
tags = subprocess.run(['bash', '-c', 'curl -s http://localhost:11434/api/tags'],
                      capture_output=True, text=True).stdout
if 'qwen2.5-coder' in tags and 'deepseek-r1' in tags:
    print("\n✓ Models ready")
else:
    print("\n✗ Model pull may have failed. Tags reported:\n", tags)

# Install pyngrok
print("\nInstalling pyngrok...")
subprocess.run(['pip', 'install', 'pyngrok', '-q'], check=True)
print("✓ pyngrok installed")

# Set up ngrok tunnel
print("\n=== Setting up ngrok tunnel ===")
print("Get your free token at: https://dashboard.ngrok.com/get-started/your-authtoken")
ngrok_token = input("\nPaste your ngrok auth token here: ").strip()

if ngrok_token:
    from pyngrok import ngrok
    ngrok.set_auth_token(ngrok_token)
    tunnel = ngrok.connect(11434)
    public_url = tunnel.public_url
    print(f"\n✓ Your Colab worker is live at:")
    print(f"\n  {public_url}\n")
    print("Copy that URL — you need it to start the router on your laptop.")
    print(f"  COLAB_BASEURL={public_url}")
else:
    print("Skipped. Re-run the ngrok section manually if needed.")

print("\n✓ Colab worker ready! Keep this notebook running.")
