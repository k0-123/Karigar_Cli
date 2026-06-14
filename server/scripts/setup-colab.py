# Karigar Worker Setup for Google Colab
# Run this in a Colab cell to set up a GPU worker
# Provides: DeepSeek R1 1.5B + Qwen2.5-Coder 14B on a T4 (16GB VRAM)

import subprocess
import os

print("=== Karigar Worker Setup: Google Colab ===")
print("GPU: T4 (16GB VRAM)")
print("Models: DeepSeek R1 1.5B Q4 (1.2GB) + Qwen2.5-Coder 14B Q4 (9GB)")

# Check GPU
gpu_output = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
print("\nGPU Status:")
print(gpu_output.stdout)

# Install Ollama
print("\nInstalling Ollama...")
subprocess.run(['apt-get', 'update'], check=True, capture_output=True)
subprocess.run(['apt-get', 'install', '-y', 'curl'], check=True, capture_output=True)
subprocess.run(['bash', '-c', 'curl -fsSL https://ollama.ai/install.sh | sh'], check=True, capture_output=True)

# Start Ollama
print("Starting Ollama server...")
os.system('ollama serve &')

# Wait for Ollama to start
import time
time.sleep(5)

# Pull models
print("\nPulling DeepSeek R1 1.5B (quantized to 4-bit)...")
os.system('ollama pull deepseek-r1:1.5b-q4')

print("\nPulling Qwen2.5-Coder 14B (quantized to 4-bit)...")
os.system('ollama pull qwen2.5-coder:14b-q4')

# Set up ngrok tunnel for remote access
print("\n=== Setting up ngrok tunnel for remote access ===")
print("Get a free ngrok auth token at https://dashboard.ngrok.com")
ngrok_token = input("Paste your ngrok auth token (or press Enter to skip): ")

if ngrok_token:
    subprocess.run(['pip', 'install', 'pyngrok', '-q'], check=True)
    from pyngrok import ngrok
    public_url = ngrok.connect(11434)
    print(f"\n✓ Ollama is now accessible at: {public_url}")
    print(f"Set COLAB_BASEURL={public_url} in your server environment")
else:
    print("\nTo expose Ollama to the internet, install ngrok:")
    print("  pip install pyngrok")
    print("  from pyngrok import ngrok")
    print("  ngrok.connect(11434)")

print("\n✓ Colab worker ready!")
