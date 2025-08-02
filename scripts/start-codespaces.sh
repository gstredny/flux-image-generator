#!/bin/bash
set -e

echo "🎨 Starting FLUX Image Generator..."
echo "==================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Check if we're in Codespaces and set URLs
if [ -n "$CODESPACE_NAME" ]; then
    FRONTEND_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    BACKEND_URL="https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    
    # Update frontend environment
    echo "VITE_API_ENDPOINT=$BACKEND_URL" > frontend/.env.local
else
    FRONTEND_URL="http://localhost:3000"
    BACKEND_URL="http://localhost:7860"
fi

# Start backend
echo "🚀 Starting backend API server..."
cd backend/colab-integration
if [ -n "$CODESPACE_NAME" ]; then
    python flux_krea_api.py --codespaces &
else
    python flux_krea_api.py &
fi
BACKEND_PID=$!
cd ../..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check the logs above."
    exit 1
fi

# Start frontend
echo "🚀 Starting frontend development server..."
cd frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

# Wait a bit for frontend to start
sleep 3

# Display URLs
echo ""
echo "✨ FLUX Image Generator is running!"
echo "==================================="
echo ""
echo "🌐 Frontend: $FRONTEND_URL"
echo "🔧 Backend API: $BACKEND_URL"
echo "📚 API Docs: $BACKEND_URL/docs"
echo ""
echo "💡 Tips:"
echo "  - First image generation will take 5-10 minutes (model download)"
echo "  - Subsequent generations are much faster"
echo "  - Check the terminal for backend logs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
wait