#!/bin/bash
set -e

echo "🔄 Updating Codespaces environment variables..."

# Update frontend environment with Codespaces URL
if [ -n "$CODESPACE_NAME" ]; then
    export BACKEND_URL="https://${CODESPACE_NAME}-7860.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    echo "VITE_API_ENDPOINT=$BACKEND_URL" > /workspace/frontend/.env.local
    echo "✅ Frontend configured to use backend at: $BACKEND_URL"
fi

# Show helpful information
echo ""
echo "🎨 FLUX Image Generator - Codespaces"
echo "===================================="
echo ""
echo "Quick start:"
echo "  ./start-dev.sh     - Start both frontend and backend"
echo ""
echo "Or run individually:"
echo "  Backend:  cd backend/colab-integration && python flux_krea_api.py --codespaces"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "The backend will automatically use the Codespaces public URL (no ngrok needed)."
echo ""