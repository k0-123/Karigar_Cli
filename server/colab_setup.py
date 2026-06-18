import subprocess
import os
import time
import sys

print("=== Karigar Worker Setup: Google Colab ===")

# Check GPU
gpu_output = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
if gpu_output.returncode == 0:
    print("✓ GPU detected")
else:
    print("✗ No GPU found — go to Runtime > Change runtime type > T4 GPU")

# Install dependencies
print("\nInstalling dependencies...")
subprocess.run(['apt-get', 'update', '-qq'], check=True, capture_output=True)
subprocess.run(['apt-get', 'install', '-y', '-qq', 'curl', 'zstd'], check=True, capture_output=True)
print("✓ Dependencies installed (curl, zstd)")

# Install Ollama
print("\nInstalling Ollama...")
ollama_bin_path = "/usr/local/bin/ollama"

try:
    process = subprocess.Popen(['bash', '-c', 'curl -fsSL https://ollama.ai/install.sh | sh'],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    for line in process.stdout:
        sys.stdout.write(line)
    for line in process.stderr:
        sys.stderr.write(line)
    process.wait()

    if process.returncode == 0 and os.path.exists(ollama_bin_path):
        print("✓ Ollama installed successfully")
    else:
        raise Exception("Installation script failed or binary not found")
except Exception as e:
    print(f"✗ Ollama installation failed: {e}")
    sys.exit(1)

# Start Ollama
print("\nStarting Ollama server...")
os.system(f'OLLAMA_HOST=0.0.0.0:11434 nohup {ollama_bin_path} serve > /tmp/ollama.log 2>&1 &')
time.sleep(10)
print("✓ Ollama server started")

# Pull models
print("\nPulling DeepSeek R1 1.5B (~1.2GB, fast model)...")
subprocess.run([ollama_bin_path, 'pull', 'deepseek-r1:1.5b'], check=True)

print("\nPulling Qwen2.5-Coder 14B (~9GB, code model, takes ~10 min)...")
subprocess.run([ollama_bin_path, 'pull', 'qwen2.5-coder:14b'], check=True)

print("\n✓ Models ready")

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
    print("Copy that URL and update your Karigar config:")
    print(f"  COLAB_BASEURL={public_url}")
    print("\nKeep this notebook running!")
else:
    print("Skipped. Re-run the ngrok section manually if needed.")
