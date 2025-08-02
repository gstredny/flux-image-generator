# 🎨 FLUX Image Generator - George's Dream Factory 🏭

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/gstredny/flux-image-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![FLUX](https://img.shields.io/badge/FLUX-Image_Generator-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

Where Dreams Become Images - A magical AI-powered image generation workshop built with FLUX. Features a stunning glassmorphic interface with a modern React frontend and Python/FastAPI backend that can run on GitHub Codespaces, Google Colab, Docker, or locally.

## ✨ Features

- **🎨 Magical Interface**: Stunning glassmorphic design with dreamy animations
- **🌟 Real-time Generation**: Transform your dreams into images with FLUX model
- **🎯 Parameter Control**: Fine-tune generation with steps, CFG scale, seed, and resolution
- **🖼️ Image Gallery**: Browse your dream collection with swipe gestures
- **🔄 Smart Retry Logic**: Automatic retry with exponential backoff
- **🟢 Live Status**: Real-time "Dreams Ready" or "Factory Offline" indicators
- **📱 Mobile Magic**: Perfect experience on all devices with touch optimization
- **⌨️ Quick Controls**: Ctrl+Enter to generate your dreams
- **💾 Dream Memory**: Save and restore your creative history

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended - One Click!)

1. Click the "Open in GitHub Codespaces" button at the top
2. Wait for the environment to load (2-3 minutes)
3. Run `npm run dev` or `./scripts/start-codespaces.sh`
4. The app will open automatically!

### Option 2: Docker

```bash
# Clone the repository
git clone https://github.com/gstredny/flux-image-generator.git
cd flux-image-generator

# Build and run with Docker Compose
docker-compose up

# Or run in production mode
docker-compose --profile production up
```

### Option 3: Local Development

#### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Git
- GPU recommended for faster generation

## 🛠️ Installation

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`

### Backend Setup

#### Option 1: Google Colab (Recommended)

1. Open your Google Colab notebook with FLUX Krea API
2. Make sure it's running and you have the ngrok URL
3. Open the frontend Settings (gear icon) and paste your Colab URL
4. Click "Test Connection" to verify it's working

#### Option 2: Local Installation

```bash
cd backend/colab-integration
pip install -r requirements.txt
python flux_krea_api.py --ngrok
```

## 🔧 Configuration

### Frontend Configuration

Create a `.env` file in the frontend directory:

```env
VITE_API_ENDPOINT=https://your-colab-url.ngrok.io
```

### Backend Configuration

The backend supports several models:
- `FLUX.1-schnell` - Fast generation (default)
- `FLUX.1-dev` - Higher quality (requires HuggingFace auth)
- Custom models can be configured in the API

## 📱 Usage

1. **Enter a Prompt**: Describe the image you want to create
2. **Adjust Parameters**:
   - Steps: 20-50 (higher = better quality, slower)
   - CFG Scale: 1.0-10.0 (higher = closer to prompt)
   - Resolution: Choose from presets
   - Seed: Use same seed to reproduce results
3. **Generate**: Click generate or press Ctrl+Enter
4. **Download**: Save generated images locally

### Example Prompts

- "A serene Japanese garden with cherry blossoms, koi pond, soft morning light"
- "Futuristic cityscape with flying vehicles, cyberpunk aesthetic, neon lights"
- "Professional portrait photography, dramatic lighting, cinematic mood"

## ⌨️ Keyboard Shortcuts

- `Ctrl+Enter` - Generate image
- `Ctrl+Shift+C` - Clear prompt
- `Ctrl+R` - Random seed
- `Ctrl+Shift+T` - Toggle theme

## 🏗️ Architecture

```
flux-image-generator/
├── frontend/                    # React TypeScript application
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── services/           # API and storage services
│   │   ├── hooks/              # Custom React hooks
│   │   └── contexts/           # React contexts
│   └── Dockerfile
├── backend/                    # Python FastAPI server
│   └── colab-integration/
│       ├── flux_krea_api.py    # Main API server
│       └── requirements.txt
├── .devcontainer/              # GitHub Codespaces configuration
├── docker/                     # Docker configurations
├── scripts/                    # Utility scripts
│   ├── setup-codespaces.sh
│   └── start-codespaces.sh
├── docker-compose.yml          # Multi-container setup
└── docs/                       # Documentation
```

## 🌐 GitHub Codespaces

This project is optimized for GitHub Codespaces, providing a complete development environment in your browser:

- **Zero Setup**: Everything pre-configured and ready to go
- **Cloud Development**: No local installation required
- **GPU Support**: Works with CPU (GPU instances available on paid plans)
- **Automatic URLs**: No ngrok needed - Codespaces provides public URLs
- **Persistent Storage**: Your work is saved between sessions

### Codespaces Features

- Pre-installed dependencies for both frontend and backend
- Automatic port forwarding with HTTPS URLs
- VS Code in the browser with all extensions
- Model caching to speed up subsequent runs
- Environment variables pre-configured

## 🚀 Deployment

### Frontend Deployment

Build for production:

```bash
cd frontend
npm run build
```

Deploy to:
- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop `dist` folder
- **GitHub Pages**: Use GitHub Actions
- **Docker**: See `Dockerfile`

### Backend Deployment

- **Google Colab**: Use the provided notebook
- **Local Server**: Run with systemd or Docker
- **Cloud GPU**: Deploy to RunPod, Paperspace, or AWS

## 🔍 API Documentation

### Endpoints

- `GET /health` - Check server status
- `POST /generate` - Generate image
- `GET /models` - List available models

### Generate Request

```json
{
  "prompt": "A beautiful sunset",
  "steps": 30,
  "cfg_scale": 4.0,
  "seed": -1,
  "width": 1024,
  "height": 1024
}
```

## 🛡️ Security

- CORS configured for production
- Input validation on all endpoints
- Rate limiting available
- No sensitive data stored

## 🐛 Troubleshooting

### Common Issues

1. **Colab Disconnected**: Restart the notebook and update frontend URL
2. **Out of Memory**: Reduce image resolution or use CPU offload
3. **Slow Generation**: Use fewer steps or smaller resolution
4. **CORS Errors**: Check API endpoint configuration

### Debug Mode

Set `localStorage.debug = 'flux:*'` in browser console for detailed logs

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FLUX model by Black Forest Labs
- UI components from Shadcn/UI
- Icons from Lucide React

## 📖 Additional Documentation

- [GitHub Codespaces Setup](docs/CODESPACES.md)
- [API Documentation](docs/api-documentation.md)
- [Deployment Guide](docs/deployment.md)
- [Google Colab Setup](docs/colab-setup.md)

## 📞 Support

- Create an issue for bug reports
- Join our Discord for community support
- Check the docs folder for detailed guides

---

Made with ❤️ by George Stredny