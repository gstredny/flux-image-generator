#!/bin/bash
set -e

echo "🚀 Setting up FLUX Image Generator development environment..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd /workspace/backend/colab-integration
pip install --user -r requirements.txt

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspace/frontend
npm install

# Create necessary directories
mkdir -p /home/vscode/.cache/huggingface

# Set up environment variables for Codespaces
echo "🔧 Configuring environment..."
cat > /workspace/.env.codespaces <<EOF
# Backend configuration
MODEL_ID=black-forest-labs/FLUX.1-schnell
DEVICE=cpu
USE_CODESPACES_URL=true

# Frontend configuration
VITE_API_ENDPOINT=https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}
EOF

# Create convenience scripts
echo "📝 Creating helper scripts..."
cat > /workspace/start-dev.sh <<'EOF'
#!/bin/bash
# Start both frontend and backend in development mode

# Start backend
echo "Starting backend API..."
cd /workspace/backend/colab-integration
python flux_krea_api.py --host 0.0.0.0 --port 7860 --codespaces &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend..."
cd /workspace/frontend
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

echo "✨ Development servers started!"
echo "Frontend: https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
echo "Backend API: https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID" INT
wait
EOF

chmod +x /workspace/start-dev.sh

echo "✅ Setup complete! Run './start-dev.sh' to start the development servers."