#!/bin/bash
set -e

echo "🚀 Setting up FLUX Image Generator development environment..."
echo "⏰ This will take about 5-10 minutes on first setup..."
echo ""

# Install backend dependencies with CPU-optimized PyTorch
echo "📦 Installing backend dependencies (CPU-optimized for Codespaces)..."
cd /workspace/backend/colab-integration

# Install core dependencies first
echo "  → Installing core packages..."
pip install --user --no-cache-dir fastapi uvicorn pydantic pillow python-multipart nest-asyncio pyngrok

# Install PyTorch CPU version (smaller and faster for Codespaces)
echo "  → Installing PyTorch CPU (this may take 2-3 minutes)..."
pip install --user --no-cache-dir torch==2.2.0 torchvision==0.17.0 --index-url https://download.pytorch.org/whl/cpu

# Install diffusers and transformers
echo "  → Installing diffusers and transformers..."
pip install --user --no-cache-dir diffusers==0.26.3 transformers==4.38.1 accelerate==0.27.2

echo "✅ Backend dependencies installed!"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd /workspace/frontend
npm install --silent

echo "✅ Frontend dependencies installed!"

# Create necessary directories
mkdir -p /home/vscode/.cache/huggingface

# Set up environment variables for Codespaces
echo ""
echo "🔧 Configuring environment..."
cat > /workspace/.env.codespaces <<EOF
# Backend configuration
MODEL_ID=black-forest-labs/FLUX.1-schnell
DEVICE=cpu
FORCE_CPU=true
USE_CODESPACES_URL=true
MODEL_CACHE_DIR=/home/vscode/.cache/huggingface

# Frontend configuration
VITE_API_ENDPOINT=https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}
EOF

# Create convenience scripts
echo "📝 Creating helper scripts..."
cat > /workspace/start-dev.sh <<'EOF'
#!/bin/bash
# Start both frontend and backend in development mode

echo "🚀 Starting FLUX Image Generator in Codespaces..."
echo ""

# Export environment variables
export FORCE_CPU=true
export MODEL_CACHE_DIR=/home/vscode/.cache/huggingface
export CODESPACES=true

# Start backend
echo "🔧 Starting backend API server..."
echo "  → Server will start immediately"
echo "  → Model will load in the background (5-10 minutes on first run)"
echo ""
cd /workspace/backend/colab-integration
python flux_krea_api.py --host 0.0.0.0 --port 7860 --codespaces &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend
echo ""
echo "🎨 Starting frontend development server..."
cd /workspace/frontend
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

# Wait a moment for everything to start
sleep 3

echo ""
echo "✨ Development servers are starting!"
echo "="*60
echo "📱 Frontend: https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
echo "🔌 Backend API: https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
echo "📚 API Docs: https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/docs"
echo "="*60
echo ""
echo "⚠️  NOTE: The AI model will load in the background."
echo "    Check the backend logs or /status endpoint for progress."
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID" INT
wait
EOF

chmod +x /workspace/start-dev.sh

# Create a quick status check script
cat > /workspace/check-status.sh <<'EOF'
#!/bin/bash
echo "🔍 Checking FLUX Image Generator status..."
echo ""
echo "Backend status:"
curl -s https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/status | python -m json.tool
echo ""
echo "To view live backend logs:"
echo "tail -f /tmp/flux-backend.log"
EOF

chmod +x /workspace/check-status.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Quick start: Run './start-dev.sh'"
echo "📊 Check status: Run './check-status.sh'"
echo ""
echo "💡 The AI model will download in the background on first run (5-10 minutes)"