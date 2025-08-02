# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Preview production build
npm run preview
```

### Backend Development
```bash
cd backend/colab-integration

# Install Python dependencies
pip install -r requirements.txt

# Run local API server
python flux_krea_api.py --port 7860

# Run with ngrok tunnel (for remote access)
python flux_krea_api.py --ngrok
```

### Running Tests
No test suite is currently configured. Consider adding tests with Vitest for frontend and pytest for backend.

## Architecture Overview

### Frontend Architecture
The frontend is a React TypeScript application using:
- **State Management**: Context API with AppContext (global state) and ThemeContext (theme management)
- **API Communication**: Service layer (`services/api.ts`) with automatic retry logic and exponential backoff
- **Component Structure**: 
  - UI components in `components/ui/` (shadcn/ui based)
  - Feature components like `PromptInput`, `ParameterControls`, `ImageGallery`
  - Custom hooks in `hooks/` for business logic separation
- **Styling**: Tailwind CSS with CSS variables for theming

### Backend Architecture
Python FastAPI server providing:
- **Model Integration**: FLUX model via diffusers library
- **Endpoints**:
  - `GET /health` - Server status check
  - `POST /generate` - Image generation with parameters
  - `GET /status` - Model loading status
  - `GET /models` - Available models list
- **CORS Configuration**: Supports both local and remote frontend connections
- **Memory Management**: Automatic CPU offload for low GPU memory

### Key Architectural Patterns

1. **Retry Logic**: The API service implements intelligent retry with exponential backoff for handling transient failures
2. **Connection Management**: Frontend maintains connection status and automatically displays "Dreams Ready" or "Factory Offline"
3. **Image Storage**: Generated images are stored in browser memory with base64 encoding
4. **Parameter Flow**: Frontend parameters are mapped to backend expectations (e.g., `cfgScale` → `cfg_guidance`)

## Configuration Requirements

### Environment Variables
Frontend `.env`:
```env
VITE_API_ENDPOINT=https://your-backend-url.ngrok.io
```

### API Endpoint Storage
The frontend stores the API endpoint in localStorage and falls back to environment variable or default localhost.

### CORS Headers
Special handling for ngrok with `ngrok-skip-browser-warning` header to prevent browser warning page.

## Important Implementation Details

1. **Error Handling**: API service translates backend errors into user-friendly messages
2. **Seed Management**: Frontend sends -1 for random seed, backend generates random value
3. **Resolution Constraints**: Min 512px, max 2048px for both width and height
4. **Timeout Configuration**: 2-minute timeout for image generation requests
5. **Model Loading**: Backend checks model loading status before accepting generation requests

## Deployment Considerations

- Frontend can be deployed to any static hosting (Vercel, Netlify)
- Backend requires GPU for reasonable performance
- Google Colab deployment uses ngrok for public URL
- Production deployment should update CORS origins from wildcard