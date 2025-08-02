# FLUX Krea Backend

FastAPI-based backend service for FLUX image generation.

## Quick Start

### Google Colab (Recommended)

1. Open `colab-integration/flux_krea_notebook.ipynb` in Google Colab
2. Enable GPU runtime
3. Run all cells
4. Copy the ngrok URL for your frontend

### Local Installation

```bash
cd colab-integration
pip install -r requirements.txt
python flux_krea_api.py
```

## Features

- FastAPI REST API
- FLUX model integration
- Automatic retry and error handling
- CORS support
- Health monitoring
- Base64 image encoding
- GPU/CPU support
- Model caching

## API Endpoints

- `GET /health` - Check server status
- `POST /generate` - Generate image from prompt
- `GET /models` - List available models

See full [API Documentation](../docs/api-documentation.md).

## Configuration

### Models

Default model: `black-forest-labs/FLUX.1-schnell`

Other options:
- `FLUX.1-dev` - Higher quality, requires auth
- `stabilityai/stable-diffusion-3-medium-diffusers`

### Environment Variables

```bash
export HF_HOME=/path/to/model/cache
export CUDA_VISIBLE_DEVICES=0
```

### Command Line Options

```bash
python flux_krea_api.py --help

Options:
  --port INTEGER     Port to run server on (default: 7860)
  --host TEXT        Host to bind to (default: 0.0.0.0)
  --ngrok           Use ngrok for public URL
  --ngrok-token TEXT ngrok auth token
```

## Requirements

### System Requirements

- Python 3.10+
- NVIDIA GPU with 6GB+ VRAM (recommended)
- 10GB+ disk space for model
- CUDA 11.8+ (for GPU)

### Python Dependencies

See `requirements.txt`:
- fastapi
- uvicorn
- torch
- diffusers
- transformers
- pillow
- pyngrok

## Performance

### GPU Optimization

```python
# Enable optimizations
pipe.enable_attention_slicing()
pipe.enable_vae_slicing()
pipe.enable_model_cpu_offload()  # For low VRAM
```

### Generation Times

- RTX 3090: ~8-12s per image
- RTX 3060: ~15-20s per image
- T4 (Colab): ~20-30s per image
- CPU: 2-5 minutes per image

## Docker

```dockerfile
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "flux_krea_api.py"]
```

Build and run:
```bash
docker build -t flux-krea-backend .
docker run --gpus all -p 7860:7860 flux-krea-backend
```

## Troubleshooting

### Common Issues

**CUDA out of memory**
```python
# Reduce memory usage
pipe.enable_model_cpu_offload()
torch.cuda.empty_cache()
```

**Model download fails**
```bash
# Use different cache directory
export HF_HOME=/path/with/more/space
```

**Slow generation**
- Use fewer steps (20-25)
- Reduce resolution
- Enable optimizations

## Security

- Add API authentication for production
- Use HTTPS with proper certificates
- Implement rate limiting
- Validate and sanitize inputs
- Monitor for abuse

## Contributing

1. Fork repository
2. Create feature branch
3. Test thoroughly
4. Submit PR

## License

MIT License - see LICENSE file