# Setup Guide

This guide will walk you through setting up the FLUX Krea Image Generator from scratch.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Frontend Setup](#frontend-setup)
3. [Backend Setup](#backend-setup)
4. [Configuration](#configuration)
5. [Verification](#verification)

## System Requirements

### Minimum Requirements
- **CPU**: 4 cores, 2.5GHz+
- **RAM**: 8GB (16GB recommended)
- **GPU**: NVIDIA GPU with 6GB+ VRAM (optional but recommended)
- **Storage**: 10GB free space
- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)

### Software Requirements
- Node.js 18+ and npm 9+
- Python 3.10+
- Git
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Frontend Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd flux-krea-app/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your API endpoint:

```env
VITE_API_ENDPOINT=http://localhost:7860
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Backend Setup

You have two options for running the backend:

### Option A: Google Colab (Recommended for Beginners)

1. **Open the Notebook**
   - Navigate to `backend/colab-integration/`
   - Open `flux_krea_notebook.ipynb` in Google Colab

2. **Enable GPU Runtime**
   - Go to Runtime → Change runtime type
   - Select GPU as the hardware accelerator
   - Click Save

3. **Run the Notebook**
   - Run each cell in order
   - Wait for the model to download (first run only)
   - Copy the ngrok URL when it appears

4. **Update Frontend Configuration**
   - Add the ngrok URL to your frontend `.env` file
   - Restart the frontend development server

### Option B: Local Installation

1. **Create Python Environment**

```bash
cd backend/colab-integration
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

2. **Install Dependencies**

```bash
pip install -r requirements.txt
```

3. **Install PyTorch with CUDA (if you have NVIDIA GPU)**

```bash
# For CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

4. **Run the Server**

```bash
# Basic startup
python flux_krea_api.py

# With ngrok for public URL
python flux_krea_api.py --ngrok

# With custom port
python flux_krea_api.py --port 8080
```

5. **First Run Setup**
   - The model will download on first run (~7GB)
   - This may take 10-30 minutes depending on your connection
   - Subsequent runs will be much faster

## Configuration

### Frontend Configuration Options

Edit `src/utils/constants.ts` to customize:

```typescript
// Default generation parameters
export const DEFAULT_PARAMETERS = {
  steps: 30,        // Inference steps (20-50)
  cfgScale: 4.0,    // Guidance scale (1.0-10.0)
  seed: -1,         // Random seed
  width: 1024,      // Image width
  height: 1024,     // Image height
};

// Available resolutions
export const RESOLUTIONS = [
  { label: "Square (1024x1024)", width: 1024, height: 1024 },
  { label: "Portrait (768x1024)", width: 768, height: 1024 },
  // Add more resolutions as needed
];
```

### Backend Configuration Options

Modify `flux_krea_api.py` to change:

```python
# Model selection
MODEL_ID = "black-forest-labs/FLUX.1-schnell"  # Fast model
# MODEL_ID = "black-forest-labs/FLUX.1-dev"    # Quality model

# Server settings
DEFAULT_PORT = 7860
DEFAULT_HOST = "0.0.0.0"

# Generation limits
MAX_WIDTH = 2048
MAX_HEIGHT = 2048
MAX_STEPS = 50
```

### Performance Tuning

For low-memory systems, enable CPU offload:

```python
# In flux_krea_api.py
pipe.enable_model_cpu_offload()
pipe.enable_attention_slicing()
```

## Verification

### 1. Check Backend Health

```bash
curl http://localhost:7860/health
```

Expected response:
```json
{
  "status": "healthy",
  "model": "black-forest-labs/FLUX.1-schnell",
  "device": "cuda",
  "version": "1.0.0"
}
```

### 2. Test Image Generation

```bash
curl -X POST http://localhost:7860/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A test image of a sunset",
    "steps": 20,
    "cfg_scale": 4.0,
    "seed": 42,
    "width": 512,
    "height": 512
  }'
```

### 3. Frontend Connection Test

1. Open browser developer tools (F12)
2. Go to Network tab
3. Try generating an image
4. Check for successful API calls

## Troubleshooting

### Frontend Issues

**Problem**: Blank page or build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Problem**: API connection failed
- Check the API endpoint in `.env`
- Ensure backend is running
- Check browser console for CORS errors

### Backend Issues

**Problem**: CUDA out of memory
```python
# Reduce batch size or enable CPU offload
pipe.enable_model_cpu_offload()
```

**Problem**: Model download fails
```bash
# Set Hugging Face cache directory
export HF_HOME=/path/to/cache
```

**Problem**: Import errors
```bash
# Reinstall with specific versions
pip install torch==2.1.0 diffusers==0.26.3
```

## Next Steps

- Read the [Deployment Guide](deployment.md) for production setup
- Check [Colab Setup](colab-setup.md) for detailed Colab configuration
- Review the [API Documentation](api-documentation.md) for advanced usage