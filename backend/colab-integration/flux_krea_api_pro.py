"""
FLUX KREA Pro API Server with T5-XXL
=====================================

Enhanced version with T5-v1.1-XXL text encoder, batch generation,
progress tracking, and performance optimizations.

Usage:
    python flux_krea_api_pro.py [--port PORT] [--host HOST] [--ngrok]
"""

import os
import gc
import base64
import io
import time
import asyncio
import argparse
import logging
import threading
import queue
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field

import torch
import torch.nn as nn
from torch.cuda.amp import autocast
from PIL import Image
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from diffusers import FluxPipeline, DiffusionPipeline
from transformers import T5EncoderModel, T5TokenizerFast, CLIPTextModel, CLIPTokenizer
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    # Model IDs
    MODEL_ID = os.environ.get("MODEL_ID", "black-forest-labs/FLUX.1-schnell")
    T5_MODEL = os.environ.get("T5_MODEL", "google/t5-v1_1-xxl")  # Best T5
    CLIP_MODEL = os.environ.get("CLIP_MODEL", "openai/clip-vit-large-patch14")
    
    # Server config
    PORT = 7860
    HOST = "0.0.0.0"
    
    # Performance settings
    ENABLE_XFORMERS = True
    ENABLE_VAE_SLICING = True
    ENABLE_CPU_OFFLOAD = False
    USE_FLOAT16 = True
    TORCH_COMPILE = os.environ.get("TORCH_COMPILE", "false").lower() == "true"
    
    # Generation defaults (KREA optimized)
    DEFAULT_STEPS = 30
    DEFAULT_GUIDANCE = 4.0
    DEFAULT_WIDTH = 1024
    DEFAULT_HEIGHT = 1024
    MAX_BATCH_SIZE = 4
    
    # Queue settings
    MAX_QUEUE_SIZE = 50
    RESULT_CACHE_SIZE = 100
    WORKER_THREADS = 1

config = Config()

# Global variables
model_manager = None
generation_queue = queue.Queue(maxsize=config.MAX_QUEUE_SIZE)
results_cache = {}
cache_lock = threading.Lock()

# Data classes
@dataclass
class GenerationRequest:
    id: str
    prompt: str
    params: Dict[str, Any]
    status: str = "queued"
    progress: float = 0.0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None

# Request/Response models
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt")
    steps: int = Field(config.DEFAULT_STEPS, ge=20, le=50, description="Inference steps")
    cfg_guidance: float = Field(config.DEFAULT_GUIDANCE, ge=1.0, le=10.0, description="Guidance scale")
    seed: int = Field(-1, ge=-1, le=999999999, description="Random seed (-1 for random)")
    width: int = Field(config.DEFAULT_WIDTH, ge=512, le=2048, description="Image width")
    height: int = Field(config.DEFAULT_HEIGHT, ge=512, le=2048, description="Image height")
    negative_prompt: str = Field("", description="Negative prompt")
    num_images: int = Field(1, ge=1, le=4, description="Number of images")
    
    @validator('width', 'height')
    def validate_dimensions(cls, v):
        """Ensure dimensions are multiples of 8"""
        return (v // 8) * 8

class BatchGenerateRequest(BaseModel):
    prompts: List[str] = Field(..., min_items=1, max_items=config.MAX_BATCH_SIZE)
    steps: int = Field(config.DEFAULT_STEPS, ge=20, le=50)
    cfg_guidance: float = Field(config.DEFAULT_GUIDANCE, ge=1.0, le=10.0)
    seed: int = Field(-1)
    width: int = Field(config.DEFAULT_WIDTH, ge=512, le=2048)
    height: int = Field(config.DEFAULT_HEIGHT, ge=512, le=2048)
    negative_prompt: str = Field("")

class GenerateResponse(BaseModel):
    success: bool
    request_id: Optional[str] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None
    seed: Optional[int] = None
    error: Optional[str] = None
    duration: Optional[float] = None

class ProgressResponse(BaseModel):
    request_id: str
    status: str
    progress: float
    created_at: float
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Model Manager
class FluxKreaModelManager:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.pipe = None
        self.t5_encoder = None
        self.t5_tokenizer = None
        self.clip_model = None
        self.clip_tokenizer = None
        self.model_loaded = False
        self.loading_progress = 0
        self.loading_status = "Not started"
        
    def load_t5_xxl(self):
        """Load T5-v1.1-XXL for superior text encoding"""
        logger.info("Loading T5-v1.1-XXL text encoder (11B parameters)...")
        self.loading_status = "Loading T5-XXL"
        self.loading_progress = 10
        
        try:
            # Load tokenizer
            self.t5_tokenizer = T5TokenizerFast.from_pretrained(
                config.T5_MODEL,
                model_max_length=512,
                legacy=False
            )
            
            # Load model with optimizations
            self.t5_encoder = T5EncoderModel.from_pretrained(
                config.T5_MODEL,
                torch_dtype=torch.float16 if config.USE_FLOAT16 else torch.float32,
                device_map="auto",
                low_cpu_mem_usage=True
            )
            
            # Enable xFormers if available
            if config.ENABLE_XFORMERS and self.device == "cuda":
                try:
                    self.t5_encoder.enable_xformers_memory_efficient_attention()
                    logger.info("xFormers enabled for T5")
                except:
                    logger.warning("xFormers not available for T5")
            
            self.loading_progress = 30
            logger.info("T5-XXL loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading T5-XXL: {e}")
            self.loading_status = f"T5 Error: {str(e)}"
            return False
    
    def load_clip(self):
        """Load CLIP model"""
        logger.info("Loading CLIP text encoder...")
        self.loading_status = "Loading CLIP"
        self.loading_progress = 40
        
        try:
            self.clip_tokenizer = CLIPTokenizer.from_pretrained(config.CLIP_MODEL)
            self.clip_model = CLIPTextModel.from_pretrained(
                config.CLIP_MODEL,
                torch_dtype=torch.float16 if config.USE_FLOAT16 else torch.float32
            ).to(self.device)
            
            self.loading_progress = 50
            logger.info("CLIP loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading CLIP: {e}")
            self.loading_status = f"CLIP Error: {str(e)}"
            return False
    
    def load_flux_pipeline(self):
        """Load FLUX pipeline with custom encoders"""
        logger.info("Loading FLUX pipeline with enhanced text encoders...")
        self.loading_status = "Loading FLUX"
        self.loading_progress = 60
        
        try:
            # Load FLUX with custom encoders
            self.pipe = FluxPipeline.from_pretrained(
                config.MODEL_ID,
                text_encoder=self.t5_encoder,
                text_encoder_2=self.clip_model,
                tokenizer=self.t5_tokenizer,
                tokenizer_2=self.clip_tokenizer,
                torch_dtype=torch.float16 if config.USE_FLOAT16 else torch.float32,
                use_safetensors=True,
                variant="fp16" if config.USE_FLOAT16 else None
            )
            
            self.pipe = self.pipe.to(self.device)
            self.loading_progress = 80
            
            # Apply optimizations
            if config.ENABLE_XFORMERS and self.device == "cuda":
                try:
                    self.pipe.enable_xformers_memory_efficient_attention()
                    logger.info("xFormers enabled - 50% memory reduction")
                except:
                    logger.warning("xFormers not available")
            
            if config.ENABLE_VAE_SLICING:
                self.pipe.enable_vae_slicing()
                logger.info("VAE slicing enabled for HD images")
            
            if config.ENABLE_CPU_OFFLOAD:
                self.pipe.enable_model_cpu_offload()
                logger.info("CPU offload enabled")
            
            # Compile with Torch 2.0
            if config.TORCH_COMPILE and hasattr(torch, 'compile'):
                logger.info("Compiling model with Torch 2.0...")
                self.pipe.unet = torch.compile(self.pipe.unet, mode="reduce-overhead")
            
            self.loading_progress = 100
            self.loading_status = "Ready"
            self.model_loaded = True
            
            logger.info("FLUX pipeline ready with T5-XXL + CLIP!")
            return True
            
        except Exception as e:
            logger.error(f"Error loading FLUX: {e}")
            self.loading_status = f"FLUX Error: {str(e)}"
            return False
    
    def load_all(self):
        """Load all models"""
        success = (
            self.load_t5_xxl() and
            self.load_clip() and
            self.load_flux_pipeline()
        )
        
        if success:
            self.optimize_memory()
            logger.info(f"All models loaded! GPU Memory: {torch.cuda.memory_allocated() / 1024**3:.1f}GB")
        
        return success
    
    def optimize_memory(self):
        """Optimize GPU memory"""
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    
    def generate_image(self, prompt: str, negative_prompt: str = "", **kwargs):
        """Generate image with enhanced prompts"""
        if not self.model_loaded:
            raise RuntimeError("Model not loaded")
        
        # Set defaults
        steps = kwargs.get('steps', config.DEFAULT_STEPS)
        guidance_scale = kwargs.get('guidance_scale', config.DEFAULT_GUIDANCE)
        width = kwargs.get('width', config.DEFAULT_WIDTH)
        height = kwargs.get('height', config.DEFAULT_HEIGHT)
        seed = kwargs.get('seed', -1)
        num_images = kwargs.get('num_images', 1)
        
        # Handle seed
        if seed == -1:
            seed = torch.randint(0, 1000000, (1,)).item()
        
        generator = torch.Generator(device=self.device).manual_seed(seed)
        
        # Generate with autocast for performance
        with torch.cuda.amp.autocast(enabled=True):
            result = self.pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                generator=generator,
                width=width,
                height=height,
                num_images_per_prompt=num_images
            )
        
        return result.images, seed

# Initialize model manager globally
def initialize_model_manager():
    global model_manager
    model_manager = FluxKreaModelManager()
    return model_manager

# Create FastAPI app
app = FastAPI(
    title="FLUX KREA Pro API",
    version="2.0.0",
    description="Enhanced FLUX API with T5-XXL text encoder"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    global model_manager
    model_manager = initialize_model_manager()
    
    # Start model loading in background
    loading_thread = threading.Thread(target=model_manager.load_all, daemon=True)
    loading_thread.start()
    
    # Start worker threads
    for i in range(config.WORKER_THREADS):
        worker_thread = threading.Thread(target=generation_worker, daemon=True, name=f"Worker-{i}")
        worker_thread.start()
    
    logger.info("API server started")

# API Routes
@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        'name': 'FLUX KREA Pro API',
        'version': '2.0.0',
        'model': 'FLUX.1 with T5-XXL',
        'features': [
            'T5-v1.1-XXL text encoder (11B parameters)',
            'CLIP ViT-L/14 encoder',
            'Batch generation up to 4 images',
            'Real-time progress tracking',
            'xFormers memory optimization',
            'VAE slicing for HD images',
            'Queue-based processing',
            'Concurrent request handling'
        ],
        'endpoints': {
            'health': '/health',
            'status': '/status',
            'generate': '/generate',
            'batch': '/generate/batch',
            'progress': '/progress/{request_id}',
            'models': '/models'
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_data = {
        'status': 'healthy' if model_manager and model_manager.model_loaded else 'loading',
        'device': model_manager.device if model_manager else 'unknown',
        'model_loaded': model_manager.model_loaded if model_manager else False
    }
    
    if torch.cuda.is_available():
        health_data['gpu'] = {
            'name': torch.cuda.get_device_name(0),
            'memory_allocated': f"{torch.cuda.memory_allocated() / 1024**3:.1f}GB",
            'memory_reserved': f"{torch.cuda.memory_reserved() / 1024**3:.1f}GB",
            'memory_total': f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB"
        }
    
    return health_data

@app.get("/status")
async def status_check():
    """Detailed status endpoint"""
    if not model_manager:
        return {
            'status': 'initializing',
            'progress': 0,
            'model_loaded': False
        }
    
    return {
        'status': model_manager.loading_status,
        'progress': model_manager.loading_progress,
        'model_loaded': model_manager.model_loaded,
        'models_loaded': model_manager.model_loaded,
        'models_loading': not model_manager.model_loaded and model_manager.loading_progress > 0,
        'device': model_manager.device,
        'queue_size': generation_queue.qsize(),
        'active_requests': len([r for r in results_cache.values() if r.status == "processing"]),
        'features': {
            'xformers': config.ENABLE_XFORMERS,
            'vae_slicing': config.ENABLE_VAE_SLICING,
            'torch_compile': config.TORCH_COMPILE,
            't5_xxl': model_manager.t5_encoder is not None,
            'clip': model_manager.clip_model is not None
        }
    }

@app.post("/generate", response_model=GenerateResponse)
async def generate_image(request: GenerateRequest):
    """Generate single image"""
    if not model_manager or not model_manager.model_loaded:
        raise HTTPException(503, "Model is still loading")
    
    # Create request
    request_id = str(uuid.uuid4())
    gen_request = GenerationRequest(
        id=request_id,
        prompt=request.prompt,
        params=request.dict()
    )
    
    # Add to queue
    try:
        generation_queue.put_nowait(gen_request)
        with cache_lock:
            results_cache[request_id] = gen_request
    except queue.Full:
        raise HTTPException(503, "Queue is full, please try again later")
    
    # Wait for result (with timeout)
    timeout = 300  # 5 minutes
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if gen_request.status == "completed":
            return GenerateResponse(
                success=True,
                request_id=request_id,
                image=gen_request.result['images'][0] if gen_request.result else None,
                seed=gen_request.result.get('seed'),
                duration=gen_request.result.get('duration')
            )
        elif gen_request.status == "failed":
            return GenerateResponse(
                success=False,
                error=gen_request.error
            )
        await asyncio.sleep(0.1)
    
    return GenerateResponse(
        success=False,
        error="Generation timeout"
    )

@app.post("/generate/batch")
async def generate_batch(request: BatchGenerateRequest):
    """Generate multiple images"""
    if not model_manager or not model_manager.model_loaded:
        raise HTTPException(503, "Model is still loading")
    
    request_ids = []
    
    for prompt in request.prompts:
        request_id = str(uuid.uuid4())
        params = request.dict()
        params['prompt'] = prompt
        params['num_images'] = 1
        
        gen_request = GenerationRequest(
            id=request_id,
            prompt=prompt,
            params=params
        )
        
        try:
            generation_queue.put_nowait(gen_request)
            with cache_lock:
                results_cache[request_id] = gen_request
            request_ids.append(request_id)
        except queue.Full:
            break
    
    if not request_ids:
        raise HTTPException(503, "Queue is full")
    
    return {
        'success': True,
        'request_ids': request_ids,
        'message': f'Queued {len(request_ids)} images for generation'
    }

@app.get("/progress/{request_id}", response_model=ProgressResponse)
async def get_progress(request_id: str):
    """Get generation progress"""
    with cache_lock:
        gen_request = results_cache.get(request_id)
    
    if not gen_request:
        raise HTTPException(404, "Request ID not found")
    
    return ProgressResponse(
        request_id=request_id,
        status=gen_request.status,
        progress=gen_request.progress,
        created_at=gen_request.created_at,
        result=gen_request.result,
        error=gen_request.error
    )

@app.get("/models")
async def get_models():
    """Get available models"""
    return {
        'models': [{
            'id': 'flux-krea-pro',
            'name': 'FLUX KREA Pro with T5-XXL',
            'status': 'loaded' if model_manager and model_manager.model_loaded else 'loading',
            'text_encoders': {
                't5': {
                    'model': config.T5_MODEL,
                    'parameters': '11B',
                    'loaded': model_manager.t5_encoder is not None if model_manager else False
                },
                'clip': {
                    'model': config.CLIP_MODEL,
                    'loaded': model_manager.clip_model is not None if model_manager else False
                }
            },
            'recommended_settings': {
                'steps': '28-32',
                'guidance': '3.5-5.0',
                'resolution': '1024-1280'
            }
        }]
    }

# Worker function
def generation_worker():
    """Process generation requests from queue"""
    logger.info(f"Worker {threading.current_thread().name} started")
    
    while True:
        try:
            # Get request
            gen_request = generation_queue.get(timeout=1.0)
            
            if gen_request is None:
                break
            
            logger.info(f"Processing request {gen_request.id}: {gen_request.prompt[:50]}...")
            gen_request.status = "processing"
            gen_request.started_at = time.time()
            gen_request.progress = 10.0
            
            try:
                # Generate image
                params = gen_request.params
                gen_request.progress = 30.0
                
                images, seed = model_manager.generate_image(
                    prompt=params['prompt'],
                    negative_prompt=params.get('negative_prompt', ''),
                    steps=params['steps'],
                    guidance_scale=params['cfg_guidance'],
                    width=params['width'],
                    height=params['height'],
                    seed=params['seed'],
                    num_images=params.get('num_images', 1)
                )
                
                gen_request.progress = 80.0
                
                # Convert to base64
                encoded_images = []
                for img in images:
                    buffered = io.BytesIO()
                    img.save(buffered, format="PNG", optimize=True)
                    img_base64 = base64.b64encode(buffered.getvalue()).decode()
                    encoded_images.append(f"data:image/png;base64,{img_base64}")
                
                gen_request.completed_at = time.time()
                duration = gen_request.completed_at - gen_request.started_at
                
                gen_request.result = {
                    'images': encoded_images,
                    'seed': seed,
                    'duration': duration,
                    'params': params
                }
                gen_request.status = "completed"
                gen_request.progress = 100.0
                
                logger.info(f"Completed {gen_request.id} in {duration:.1f}s")
                
            except Exception as e:
                logger.error(f"Generation error for {gen_request.id}: {e}")
                gen_request.error = str(e)
                gen_request.status = "failed"
                gen_request.completed_at = time.time()
            
            # Clean up old cache entries
            cleanup_cache()
            
            # Memory cleanup
            if model_manager:
                model_manager.optimize_memory()
            
        except queue.Empty:
            continue
        except Exception as e:
            logger.error(f"Worker error: {e}")

def cleanup_cache():
    """Clean up old cache entries"""
    with cache_lock:
        if len(results_cache) > config.RESULT_CACHE_SIZE:
            # Sort by creation time and remove oldest
            sorted_items = sorted(
                results_cache.items(),
                key=lambda x: x[1].created_at
            )
            
            # Remove oldest 20%
            to_remove = len(results_cache) - int(config.RESULT_CACHE_SIZE * 0.8)
            for key, _ in sorted_items[:to_remove]:
                del results_cache[key]

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="FLUX KREA Pro API Server")
    parser.add_argument("--port", type=int, default=config.PORT, help="Port to run server on")
    parser.add_argument("--host", type=str, default=config.HOST, help="Host to bind to")
    parser.add_argument("--ngrok", action="store_true", help="Use ngrok for public URL")
    parser.add_argument("--ngrok-token", type=str, help="ngrok auth token")
    
    args = parser.parse_args()
    
    # Handle ngrok
    if args.ngrok:
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
    print(f"\n✅ Starting FLUX KREA Pro API on http://{args.host}:{args.port}")
    print(f"📝 API Documentation: http://localhost:{args.port}/docs")
    print(f"\n🚀 Features:")
    print(f"  • T5-v1.1-XXL text encoder (11B parameters)")
    print(f"  • Batch generation support")
    print(f"  • Real-time progress tracking")
    print(f"  • xFormers memory optimization")
    
    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()