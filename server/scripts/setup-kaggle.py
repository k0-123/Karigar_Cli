# Karigar Worker Setup for Kaggle
# Run this in a Kaggle notebook cell (enable GPU accelerator first)
# Provides: DeepSeek R1 1.5B + Qwen2.5-Coder 14B on T4/P100 (16GB VRAM)

import subprocess
import os

print("=== Karigar Worker Setup: Kaggle ===")
print("GPU: T4 or P100 (16GB VRAM)")
print("Models: DeepSeek R1 1.5B Q4 (1.2GB) + Qwen2.5-Coder 14B Q4 (9GB)")
print("Quota: ~30 hrs/week (shared across all Kaggle notebooks)")

# Check GPU
gpu_output = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
print("\nGPU Status:")
print(gpu_output.stdout if gpu_output.returncode == 0 else "No GPU detected — enable GPU in Kaggle notebook settings")

# Install Ollama
print("\nInstalling Ollama...")
subprocess.run(['apt-get', 'update', '-qq'], check=True, capture_output=True)
subprocess.run(['apt-get', 'install', '-y', '-qq', 'curl'], check=True, capture_output=True)
subprocess.run(['bash', '-c', 'curl -fsSL https://ollama.ai/install.sh | sh'], check=True, capture_output=True)

# Start Ollama
print("Starting Ollama server...")
os.system('ollama serve &')

import time
time.sleep(5)

# Pull models
print("\nPulling DeepSeek R1 1.5B (quantized 4-bit, ~1.2GB)...")
os.system('ollama pull deepseek-r1:1.5b-q4')

print("\nPulling Qwen2.5-Coder 14B (quantized 4-bit, ~9GB)...")
os.system('ollama pull qwen2.5-coder:14b-q4')

# Set up ngrok tunnel
print("\n=== Setting up ngrok tunnel ===")
print("Get a free ngrok token at https://dashboard.ngrok.com")
ngrok_token = input("Paste your ngrok auth token (or press Enter to skip): ")

if ngrok_token:
    subprocess.run(['pip', 'install', 'pyngrok', '-q'], check=True)
    from pyngrok import ngrok
    ngrok.set_auth_token(ngrok_token)
    public_url = ngrok.connect(11434)
    print(f"\n✓ Ollama accessible at: {public_url}")
    print(f"\nSet this in your server environment:")
    print(f"  KAGGLE_BASEURL={public_url}")
    print(f"\nOr connect directly from your laptop:")
    print(f"  karigar connect {public_url}")
else:
    print("\nSkipped ngrok setup. To expose Ollama manually:")
    print("  pip install pyngrok")
    print("  from pyngrok import ngrok")
    print("  ngrok.connect(11434)")

print("\n✓ Kaggle worker ready! Keep this notebook running.")
print("  Note: Kaggle sessions last up to 9 hours per run.")
