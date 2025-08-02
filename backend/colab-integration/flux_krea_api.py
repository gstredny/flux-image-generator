"""
FLUX Krea API Server
====================

This script can be run both in Google Colab and locally.
It provides a FastAPI server for FLUX image generation.

Usage:
    python flux_krea_api.py [--port PORT] [--host HOST] [--ngrok]
"""

import os
import base64
import io
import time
import asyncio
import argparse
import logging
import subprocess
import threading
from typing import Optional
from datetime import datetime

import torch
from PIL import Image
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from diffusers import FluxPipeline
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Model configuration
MODEL_ID = os.environ.get("MODEL_ID", "black-forest-labs/FLUX.1-schnell")  # Fast version
# Alternative models:
# - "black-forest-labs/FLUX.1-dev" (requires auth)
# - "stabilityai/stable-diffusion-3-medium-diffusers"

# Global variables
pipe = None
device = None
model_loading_thread = None
model_loading_started = False
model_loading_error = None

# Request/Response models
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt for image generation")
    steps: int = Field(30, ge=20, le=50, description="Number of inference steps")
    cfg_scale: float = Field(None, ge=1.0, le=10.0, description="CFG guidance scale (alias for cfg_guidance)")
    cfg_guidance: float = Field(None, ge=1.0, le=10.0, description="CFG guidance scale")
    seed: int = Field(-1, ge=-1, le=999999999, description="Random seed (-1 for random)")
    width: int = Field(1024, ge=512, le=2048, description="Image width")
    height: int = Field(1024, ge=512, le=2048, description="Image height")
    
    def __init__(self, **data):
        # Handle both cfg_scale and cfg_guidance for backward compatibility
        if 'cfg_scale' in data and 'cfg_guidance' not in data:
            data['cfg_guidance'] = data['cfg_scale']
        elif 'cfg_guidance' in data and 'cfg_scale' not in data:
            data['cfg_scale'] = data['cfg_guidance']
        elif 'cfg_scale' not in data and 'cfg_guidance' not in data:
            data['cfg_scale'] = 4.0
            data['cfg_guidance'] = 4.0
        super().__init__(**data)
        
    @validator('prompt')
    def validate_prompt(cls, v):
        """Validate prompt is not empty and doesn't contain harmful content."""
        if not v or not v.strip():
            raise ValueError("Prompt cannot be empty")
        return v.strip()
        
    @validator('width', 'height')
    def validate_dimensions(cls, v):
        """Ensure dimensions are multiples of 8 for better generation."""
        if v % 8 != 0:
            # Round to nearest multiple of 8
            v = round(v / 8) * 8
            v = max(512, min(2048, v))  # Ensure within bounds
        return v

class GenerateResponse(BaseModel):
    success: bool
    image: Optional[str] = None
    error: Optional[str] = None
    duration: Optional[float] = None

class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    version: str

# Initialize model
def initialize_model():
    global pipe, device, model_loading_error
    
    try:
        # Check if we should force CPU mode (useful for Codespaces)
        force_cpu = os.environ.get("FORCE_CPU", "").lower() == "true"
        device = "cpu" if force_cpu else ("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {device}")
        
        if device == "cpu":
            logger.warning("Running on CPU - generation will be slower. Consider using a GPU for better performance.")
        
        if device == "cuda":
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        
        logger.info("Loading FLUX model... This may take a few minutes on first run.")
        
        # Download with progress bar for better UX in Codespaces
        logger.info("Downloading model (this may take 5-10 minutes on first run)...")
        
        pipe = FluxPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            low_cpu_mem_usage=True,  # Important for Codespaces
            cache_dir=os.environ.get("MODEL_CACHE_DIR", None)
        )
        pipe = pipe.to(device)
        
        # Optimize for CPU if needed
        if device == "cpu":
            logger.info("Optimizing for CPU execution...")
            # Reduce memory usage on CPU
            if hasattr(pipe, "enable_attention_slicing"):
                pipe.enable_attention_slicing(1)
        
        # Enable memory efficient attention if available
        if hasattr(pipe, "enable_attention_slicing"):
            pipe.enable_attention_slicing()
        
        # Enable CPU offload for low memory systems
        if device == "cuda" and torch.cuda.get_device_properties(0).total_memory < 8 * 1024**3:
            logger.warning("Low GPU memory detected, enabling CPU offload...")
            pipe.enable_model_cpu_offload()
        
        logger.info("Model loaded successfully!")
        logger.info("🎉 FLUX Image Generator is ready!")
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        logger.error("Note: You may need to authenticate with Hugging Face for some models.")
        model_loading_error = str(e)

def start_model_loading():
    """Start loading the model in a background thread."""
    global model_loading_thread, model_loading_started
    
    if not model_loading_started:
        model_loading_started = True
        logger.info("Starting background model loading...")
        model_loading_thread = threading.Thread(target=initialize_model, daemon=True)
        model_loading_thread.start()

# Create FastAPI app
app = FastAPI(title="FLUX Krea API", version="1.0.0")

# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Incoming {request.method} request to {request.url.path}")
    if request.method == "POST":
        # Log POST body for debugging (be careful with sensitive data in production)
        try:
            body = await request.body()
            if body and len(body) < 1000:  # Only log small bodies
                logger.debug(f"Request body preview: {body[:200]}...")
        except:
            pass
    
    # Process request
    response = await call_next(request)
    
    # Log response
    duration = time.time() - start_time
    logger.info(f"Request to {request.url.path} completed in {duration:.2f}s with status {response.status_code}")
    
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Start model loading in background on startup."""
    start_model_loading()

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "FLUX Krea API Server",
        "endpoints": {
            "health": "/health",
            "generate": "/generate",
            "models": "/models",
            "docs": "/docs"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if the API is healthy and model is loaded."""
    return HealthResponse(
        status="healthy" if pipe is not None else "unhealthy",
        model=MODEL_ID,
        device=str(device),
        version="1.0.0"
    )

@app.get("/status")
async def status_check():
    """Check model loading status and server health."""
    global model_loading_error
    
    if pipe is not None:
        return {
            "status": "ok",
            "model_loaded": True,
            "models_loaded": True,  # For backward compatibility
            "models_loading": False,
            "message": "Model is ready",
            "device": str(device) if device else "unknown",
            "model": MODEL_ID
        }
    elif model_loading_error:
        return {
            "status": "error",
            "model_loaded": False,
            "models_loaded": False,
            "models_loading": False,
            "message": f"Model loading failed: {model_loading_error}",
            "device": str(device) if device else "unknown",
            "model": MODEL_ID,
            "error": model_loading_error
        }
    elif model_loading_started:
        return {
            "status": "loading",
            "model_loaded": False,
            "models_loaded": False,
            "models_loading": True,
            "message": "Model is loading in background (5-10 minutes on first run)...",
            "device": str(device) if device else "unknown",
            "model": MODEL_ID,
            "loading_started": True
        }
    else:
        return {
            "status": "pending",
            "model_loaded": False,
            "models_loaded": False,
            "models_loading": False,
            "message": "Model loading has not started yet",
            "device": str(device) if device else "unknown",
            "model": MODEL_ID
        }

@app.post("/generate", response_model=GenerateResponse)
async def generate_image(request: GenerateRequest):
    """Generate an image from a text prompt."""
    if pipe is None:
        raise HTTPException(
            status_code=503,
            detail="Model is still loading. Please wait a moment and try again."
        )
    
    start_time = time.time()
    
    try:
        # Set random seed if requested
        generator = None
        if request.seed != -1:
            generator = torch.Generator(device=device).manual_seed(request.seed)
        
        # Generate image
        logger.info(f"Starting image generation")
        logger.info(f"Prompt: {request.prompt[:100]}...")
        logger.info(f"Parameters: steps={request.steps}, cfg_guidance={request.cfg_guidance}, size={request.width}x{request.height}, seed={request.seed}")
        
        with torch.no_grad():
            # Run generation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            image = await loop.run_in_executor(
                None,
                lambda: pipe(
                    prompt=request.prompt,
                    num_inference_steps=request.steps,
                    guidance_scale=request.cfg_guidance,  # Use cfg_guidance which is normalized in __init__
                    generator=generator,
                    width=request.width,
                    height=request.height,
                ).images[0]
            )
        
        # Convert to base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG", optimize=True)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        duration = time.time() - start_time
        logger.info(f"Image generated successfully in {duration:.2f}s")
        logger.info(f"Image size: {len(img_base64)} bytes (base64)")
        
        return GenerateResponse(
            success=True,
            image=f"data:image/png;base64,{img_base64}",
            duration=duration
        )
        
    except torch.cuda.OutOfMemoryError:
        logger.error("GPU out of memory error")
        return GenerateResponse(
            success=False,
            error="GPU out of memory. Try reducing image size or restarting the backend.",
            duration=time.time() - start_time
        )
    except Exception as e:
        logger.error(f"Error generating image: {type(e).__name__}: {str(e)}")
        error_msg = str(e)
        
        # Provide more helpful error messages
        if "CUDA" in error_msg:
            error_msg = "GPU error. Please check CUDA availability and try again."
        elif "dimension" in error_msg.lower() or "size" in error_msg.lower():
            error_msg = f"Invalid image dimensions. Please use sizes between 512 and 2048. Error: {error_msg}"
        elif "prompt" in error_msg.lower():
            error_msg = "Invalid prompt. Please check your input text."
            
        return GenerateResponse(
            success=False,
            error=error_msg,
            duration=time.time() - start_time
        )

@app.get("/models")
async def get_models():
    """Get available models."""
    return {"models": [MODEL_ID]}

def get_codespaces_url(port):
    """Get the public URL when running in GitHub Codespaces."""
    codespace_name = os.environ.get('CODESPACE_NAME')
    codespaces_domain = os.environ.get('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')
    
    if codespace_name and codespaces_domain:
        return f"https://{codespace_name}-{port}.{codespaces_domain}"
    return None

def main():
    parser = argparse.ArgumentParser(description="FLUX Krea API Server")
    parser.add_argument("--port", type=int, default=7860, help="Port to run server on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--ngrok", action="store_true", help="Use ngrok for public URL")
    parser.add_argument("--ngrok-token", type=str, help="ngrok auth token")
    parser.add_argument("--codespaces", action="store_true", help="Running in GitHub Codespaces")
    
    args = parser.parse_args()
    
    # Check if running in Codespaces
    is_codespaces = args.codespaces or os.environ.get('CODESPACES') == 'true'
    
    if is_codespaces:
        # Get Codespaces URL
        public_url = get_codespaces_url(args.port)
        if public_url:
            print(f"\n🚀 Running in GitHub Codespaces")
            print(f"🔗 Public URL: {public_url}")
            print(f"📝 API Documentation: {public_url}/docs")
            print(f"\n💡 This URL is automatically accessible from your frontend!")
        else:
            print("\n⚠️  Codespaces environment variables not found")
    elif args.ngrok:
        try:
            from pyngrok import ngrok
            
            if args.ngrok_token:
                ngrok.set_auth_token(args.ngrok_token)
            
            public_url = ngrok.connect(args.port)
            print(f"\n🚀 Public URL: {public_url}")
            print(f"📝 API Documentation: {public_url}/docs")
        except ImportError:
            print("ngrok requested but pyngrok not installed. Run: pip install pyngrok")
    
    # Run server
    print(f"\n✅ Starting server on http://{args.host}:{args.port}")
    print(f"📝 API Documentation: http://localhost:{args.port}/docs")
    
    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()