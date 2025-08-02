#!/bin/bash
set -e

echo "🚀 Setting up FLUX Image Generator for Codespaces..."
echo "=================================================="

# Check if we're in Codespaces
if [ -z "$CODESPACE_NAME" ]; then
    echo "⚠️  Warning: Not running in GitHub Codespaces environment"
    echo "This script is optimized for Codespaces. Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend/colab-integration
pip install --user -r requirements.txt
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files
echo "🔧 Creating environment files..."

# Backend .env
cat > backend/colab-integration/.env <<EOF
# Model configuration
MODEL_ID=black-forest-labs/FLUX.1-schnell
FORCE_CPU=true
MODEL_CACHE_DIR=/home/vscode/.cache/huggingface

# Codespaces
CODESPACES=true
EOF

# Frontend .env.local
if [ -n "$CODESPACE_NAME" ]; then
    BACKEND_URL="https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    cat > frontend/.env.local <<EOF
VITE_API_ENDPOINT=$BACKEND_URL
EOF
    echo "✅ Frontend configured to use backend at: $BACKEND_URL"
fi

# Make scripts executable
chmod +x scripts/*.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run './scripts/start-codespaces.sh' to start both servers"
echo "2. Or run 'npm run dev' to start with concurrently"
echo ""
echo "The application will be available at:"
echo "  Frontend: Port 3000 (auto-opens in browser)"
echo "  Backend API: Port 7860"
echo ""