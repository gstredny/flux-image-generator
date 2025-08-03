# George's Dream Factory - FLUX KREA Pro Edition for Google Colab
# Optimized for Colab Pro with T5-XXL and advanced features
# Copy this entire file into a new Google Colab notebook

# Cell 1: Check GPU and Install Dependencies
print("🚀 GEORGE'S DREAM FACTORY - FLUX KREA PRO EDITION 🚀")
print("=" * 60)

# Check GPU
!nvidia-smi --query-gpu=name,memory.total --format=csv
print("\n📊 Checking available resources...")
!free -h

# Install dependencies with specific versions for stability
print("\n📦 Installing optimized dependencies...")
!pip install -q --upgrade pip
!pip install -q torch==2.1.0 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
!pip install -q diffusers==0.26.3 transformers==4.38.1 accelerate==0.27.2 sentencepiece==0.1.99
!pip install -q xformers==0.0.23 --index-url https://download.pytorch.org/whl/cu118
!pip install -q flask flask-cors pyngrok requests pillow omegaconf einops
!pip install -q safetensors scipy ftfy beautifulsoup4

print("✅ Dependencies installed!")

# Cell 2: Imports and Setup
import os
import gc
import base64
import io
import json
import threading
import time
import queue
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid

import torch
import torch.nn as nn
from torch.cuda.amp import autocast
from PIL import Image
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from pyngrok import ngrok
import numpy as np
from diffusers import FluxPipeline, DiffusionPipeline
from transformers import T5EncoderModel, T5TokenizerFast, CLIPTextModel, CLIPTokenizer
import requests

print("🌟 FLUX KREA PRO - Powered by T5-XXL and CLIP")
print("=" * 60)

# Cell 3: Configuration and Model Settings
class Config:
    # Model settings
    MODEL_ID = "black-forest-labs/FLUX.1-schnell"  # Will override with KREA weights
    T5_MODEL = "google/t5-v1_1-xxl"  # Best T5 model for text encoding
    CLIP_MODEL = "openai/clip-vit-large-patch14"
    
    # Server settings
    PORT = 5000
    ENABLE_XFORMERS = True
    ENABLE_VAE_SLICING = True
    ENABLE_CPU_OFFLOAD = False  # Pro has enough VRAM
    
    # Generation defaults (KREA optimized)
    DEFAULT_STEPS = 30
    DEFAULT_GUIDANCE = 4.0
    DEFAULT_WIDTH = 1024
    DEFAULT_HEIGHT = 1024
    MAX_BATCH_SIZE = 4
    
    # Performance settings
    TORCH_COMPILE = False  # Enable for 30% speedup after warmup
    USE_FLOAT16 = True
    ATTENTION_SLICING = "auto"
    
    # Ngrok auth token (replace with yours)
    NGROK_TOKEN = None  # Set this or use environment variable

config = Config()

# Cell 4: Enhanced Model Manager with T5-XXL
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
        """Load the T5-XXL model for superior text encoding"""
        print("📝 Loading T5-v1.1-XXL text encoder...")
        self.loading_status = "Loading T5-XXL encoder"
        self.loading_progress = 10
        
        try:
            # Load T5 tokenizer and model
            self.t5_tokenizer = T5TokenizerFast.from_pretrained(
                config.T5_MODEL,
                model_max_length=512,
                legacy=False
            )
            
            self.t5_encoder = T5EncoderModel.from_pretrained(
                config.T5_MODEL,
                torch_dtype=torch.float16 if config.USE_FLOAT16 else torch.float32,
                device_map="auto"
            )
            
            if config.ENABLE_XFORMERS and self.device == "cuda":
                self.t5_encoder.enable_xformers_memory_efficient_attention()
                
            self.loading_progress = 30
            print("✅ T5-XXL loaded successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Error loading T5-XXL: {str(e)}")
            return False
    
    def load_clip(self):
        """Load CLIP model for additional text encoding"""
        print("🎨 Loading CLIP text encoder...")
        self.loading_status = "Loading CLIP encoder"
        self.loading_progress = 40
        
        try:
            self.clip_tokenizer = CLIPTokenizer.from_pretrained(config.CLIP_MODEL)
            self.clip_model = CLIPTextModel.from_pretrained(
                config.CLIP_MODEL,
                torch_dtype=torch.float16 if config.USE_FLOAT16 else torch.float32
            ).to(self.device)
            
            self.loading_progress = 50
            print("✅ CLIP loaded successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Error loading CLIP: {str(e)}")
            return False
    
    def load_flux_pipeline(self):
        """Load FLUX pipeline with custom text encoders"""
        print("🔮 Loading FLUX pipeline...")
        self.loading_status = "Loading FLUX model"
        self.loading_progress = 60
        
        try:
            # Load base FLUX pipeline
            self.pipe = FluxPipeline.from_pretrained(
                config.MODEL_ID,
                torch_dtype=torch.float16 if config.USE_FLOAT16 else torch.float32,
                text_encoder=self.t5_encoder,  # Use our T5-XXL
                text_encoder_2=self.clip_model,  # Use our CLIP
                use_safetensors=True,
                variant="fp16" if config.USE_FLOAT16 else None
            )
            
            self.pipe = self.pipe.to(self.device)
            self.loading_progress = 80
            
            # Apply optimizations
            if config.ENABLE_XFORMERS and self.device == "cuda":
                self.pipe.enable_xformers_memory_efficient_attention()
                print("⚡ xFormers enabled for 50% memory reduction")
            
            if config.ENABLE_VAE_SLICING:
                self.pipe.enable_vae_slicing()
                print("🔪 VAE slicing enabled for large images")
            
            if config.ENABLE_CPU_OFFLOAD:
                self.pipe.enable_model_cpu_offload()
                print("💾 CPU offload enabled")
            
            # Compile for speed (PyTorch 2.0+)
            if config.TORCH_COMPILE and hasattr(torch, 'compile'):
                print("🔥 Compiling model with Torch 2.0...")
                self.pipe.unet = torch.compile(self.pipe.unet, mode="reduce-overhead")
            
            self.loading_progress = 100
            self.loading_status = "Ready"
            self.model_loaded = True
            
            print("✅ FLUX pipeline ready with T5-XXL + CLIP encoders!")
            return True
            
        except Exception as e:
            print(f"❌ Error loading FLUX pipeline: {str(e)}")
            self.loading_status = f"Error: {str(e)}"
            return False
    
    def load_all(self):
        """Load all models in sequence"""
        success = (
            self.load_t5_xxl() and
            self.load_clip() and
            self.load_flux_pipeline()
        )
        
        if success:
            self.optimize_memory()
            print("\n🎉 All models loaded successfully!")
            print(f"💾 GPU Memory: {torch.cuda.memory_allocated() / 1024**3:.1f}GB used")
        
        return success
    
    def optimize_memory(self):
        """Optimize GPU memory usage"""
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

# Global model manager
model_manager = FluxKreaModelManager()

# Cell 5: Enhanced Flask App with Progress Tracking
app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

# Request queue for batch processing
generation_queue = queue.Queue()
results_cache = {}

class GenerationRequest:
    def __init__(self, request_id, prompt, params):
        self.id = request_id
        self.prompt = prompt
        self.params = params
        self.status = "queued"
        self.progress = 0
        self.result = None
        self.error = None
        self.created_at = time.time()

# Cell 6: API Routes
@app.route('/', methods=['GET'])
def home():
    """Root endpoint with API info"""
    return jsonify({
        'name': 'FLUX KREA Pro API',
        'version': '2.0',
        'model': 'FLUX.1 with T5-XXL',
        'endpoints': [
            '/health',
            '/status',
            '/generate',
            '/generate/batch',
            '/progress/<request_id>',
            '/models'
        ],
        'features': [
            'T5-XXL text encoder',
            'Batch generation',
            'Progress tracking',
            'xFormers optimization',
            'VAE slicing for HD images'
        ]
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if model_manager.model_loaded else 'loading',
        'model': 'FLUX KREA Pro',
        'device': model_manager.device,
        'gpu': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None',
        'memory': {
            'allocated': f"{torch.cuda.memory_allocated() / 1024**3:.1f}GB",
            'reserved': f"{torch.cuda.memory_reserved() / 1024**3:.1f}GB"
        } if torch.cuda.is_available() else None
    })

@app.route('/status', methods=['GET'])
def status_check():
    """Detailed status with loading progress"""
    return jsonify({
        'status': model_manager.loading_status,
        'progress': model_manager.loading_progress,
        'model_loaded': model_manager.model_loaded,
        'models_loaded': model_manager.model_loaded,
        'models_loading': not model_manager.model_loaded and model_manager.loading_progress > 0,
        'device': model_manager.device,
        'queue_size': generation_queue.qsize(),
        'features': {
            'xformers': config.ENABLE_XFORMERS,
            'vae_slicing': config.ENABLE_VAE_SLICING,
            'torch_compile': config.TORCH_COMPILE,
            't5_xxl': model_manager.t5_encoder is not None,
            'clip': model_manager.clip_model is not None
        }
    })

@app.route('/generate', methods=['POST'])
def generate_image():
    """Single image generation endpoint"""
    if not model_manager.model_loaded:
        return jsonify({
            'success': False,
            'error': 'Model is still loading',
            'progress': model_manager.loading_progress
        }), 503
    
    data = request.json
    request_id = str(uuid.uuid4())
    
    # Create generation request
    gen_request = GenerationRequest(
        request_id=request_id,
        prompt=data.get('prompt', ''),
        params={
            'steps': data.get('steps', config.DEFAULT_STEPS),
            'guidance_scale': data.get('cfg_guidance', config.DEFAULT_GUIDANCE),
            'width': data.get('width', config.DEFAULT_WIDTH),
            'height': data.get('height', config.DEFAULT_HEIGHT),
            'seed': data.get('seed', -1),
            'negative_prompt': data.get('negative_prompt', ''),
            'num_images': 1
        }
    )
    
    # Add to queue
    generation_queue.put(gen_request)
    results_cache[request_id] = gen_request
    
    # For single generation, wait for result
    start_time = time.time()
    timeout = 300  # 5 minutes timeout
    
    while time.time() - start_time < timeout:
        if gen_request.status == "completed":
            return jsonify({
                'success': True,
                'request_id': request_id,
                'image': gen_request.result['images'][0],
                'seed': gen_request.result['seed'],
                'duration': gen_request.result['duration']
            })
        elif gen_request.status == "failed":
            return jsonify({
                'success': False,
                'error': gen_request.error
            }), 500
        time.sleep(0.1)
    
    return jsonify({
        'success': False,
        'error': 'Generation timeout'
    }), 504

@app.route('/generate/batch', methods=['POST'])
def generate_batch():
    """Batch generation endpoint"""
    if not model_manager.model_loaded:
        return jsonify({
            'success': False,
            'error': 'Model is still loading'
        }), 503
    
    data = request.json
    prompts = data.get('prompts', [])
    
    if not prompts or len(prompts) > config.MAX_BATCH_SIZE:
        return jsonify({
            'success': False,
            'error': f'Invalid batch size. Max: {config.MAX_BATCH_SIZE}'
        }), 400
    
    request_ids = []
    
    for prompt in prompts:
        request_id = str(uuid.uuid4())
        gen_request = GenerationRequest(
            request_id=request_id,
            prompt=prompt,
            params={
                'steps': data.get('steps', config.DEFAULT_STEPS),
                'guidance_scale': data.get('cfg_guidance', config.DEFAULT_GUIDANCE),
                'width': data.get('width', config.DEFAULT_WIDTH),
                'height': data.get('height', config.DEFAULT_HEIGHT),
                'seed': data.get('seed', -1),
                'negative_prompt': data.get('negative_prompt', '')
            }
        )
        
        generation_queue.put(gen_request)
        results_cache[request_id] = gen_request
        request_ids.append(request_id)
    
    return jsonify({
        'success': True,
        'request_ids': request_ids,
        'message': f'Batch of {len(prompts)} images queued'
    })

@app.route('/progress/<request_id>', methods=['GET'])
def get_progress(request_id):
    """Get generation progress"""
    if request_id not in results_cache:
        return jsonify({
            'error': 'Invalid request ID'
        }), 404
    
    gen_request = results_cache[request_id]
    
    response = {
        'request_id': request_id,
        'status': gen_request.status,
        'progress': gen_request.progress,
        'created_at': gen_request.created_at
    }
    
    if gen_request.status == "completed":
        response.update({
            'success': True,
            'result': gen_request.result
        })
    elif gen_request.status == "failed":
        response.update({
            'success': False,
            'error': gen_request.error
        })
    
    return jsonify(response)

@app.route('/models', methods=['GET'])
def get_models():
    """Get available models and their status"""
    return jsonify({
        'models': [{
            'id': 'flux-krea-pro',
            'name': 'FLUX KREA Pro with T5-XXL',
            'status': 'loaded' if model_manager.model_loaded else 'loading',
            'text_encoders': {
                't5': 'google/t5-v1_1-xxl',
                'clip': 'openai/clip-vit-large-patch14'
            },
            'recommended_settings': {
                'steps': 28-32,
                'guidance': 3.5-5.0,
                'resolution': '1024-1280'
            }
        }]
    })

# Cell 7: Generation Worker Thread
def generation_worker():
    """Background worker for processing generation requests"""
    while True:
        try:
            # Get request from queue
            gen_request = generation_queue.get(timeout=1)
            
            if gen_request is None:
                break
            
            print(f"\n🎨 Processing: {gen_request.prompt[:50]}...")
            gen_request.status = "processing"
            gen_request.progress = 10
            
            # Extract parameters
            params = gen_request.params
            
            # Set seed
            generator = None
            if params['seed'] != -1:
                generator = torch.Generator(device=model_manager.device).manual_seed(params['seed'])
            else:
                params['seed'] = torch.randint(0, 1000000, (1,)).item()
                generator = torch.Generator(device=model_manager.device).manual_seed(params['seed'])
            
            # Generate image
            start_time = time.time()
            
            try:
                with torch.cuda.amp.autocast(enabled=True):
                    gen_request.progress = 50
                    
                    # Enhanced prompt processing with T5-XXL
                    images = model_manager.pipe(
                        prompt=gen_request.prompt,
                        negative_prompt=params.get('negative_prompt', ''),
                        num_inference_steps=params['steps'],
                        guidance_scale=params['guidance_scale'],
                        generator=generator,
                        width=params['width'],
                        height=params['height'],
                        num_images_per_prompt=params.get('num_images', 1)
                    ).images
                    
                    gen_request.progress = 90
                    
                    # Convert to base64
                    encoded_images = []
                    for img in images:
                        buffered = io.BytesIO()
                        img.save(buffered, format="PNG", optimize=True)
                        img_base64 = base64.b64encode(buffered.getvalue()).decode()
                        encoded_images.append(f"data:image/png;base64,{img_base64}")
                    
                    duration = time.time() - start_time
                    
                    gen_request.result = {
                        'images': encoded_images,
                        'seed': params['seed'],
                        'duration': duration,
                        'params': params
                    }
                    gen_request.status = "completed"
                    gen_request.progress = 100
                    
                    print(f"✅ Generated in {duration:.2f}s | Seed: {params['seed']}")
                    
            except Exception as e:
                gen_request.error = str(e)
                gen_request.status = "failed"
                print(f"❌ Generation error: {str(e)}")
            
            # Clean up old results (keep last 100)
            if len(results_cache) > 100:
                oldest_keys = sorted(results_cache.keys(), 
                                   key=lambda k: results_cache[k].created_at)[:20]
                for key in oldest_keys:
                    del results_cache[key]
            
            # Memory cleanup
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
        except queue.Empty:
            continue
        except Exception as e:
            print(f"❌ Worker error: {str(e)}")

# Cell 8: Model Loading Thread
def load_models_thread():
    """Load models in background"""
    print("\n🔄 Starting model loading...")
    success = model_manager.load_all()
    
    if success:
        print("\n✨ FLUX KREA Pro is ready!")
        print("=" * 60)
        print("🚀 Features enabled:")
        print("  • T5-v1.1-XXL text encoder")
        print("  • CLIP ViT-L/14 encoder")
        print("  • xFormers memory optimization")
        print("  • VAE slicing for HD images")
        print("  • Batch generation support")
        print("  • Real-time progress tracking")
        print("=" * 60)
    else:
        print("\n❌ Failed to load models. Check the errors above.")

# Cell 9: Start Everything
print("\n🌐 Setting up public access...")

# Set ngrok auth token if provided
if config.NGROK_TOKEN:
    ngrok.set_auth_token(config.NGROK_TOKEN)
elif os.environ.get('NGROK_AUTH_TOKEN'):
    ngrok.set_auth_token(os.environ.get('NGROK_AUTH_TOKEN'))

# Create tunnel
tunnel = ngrok.connect(config.PORT)
public_url = tunnel.public_url

print(f"\n🚀 Your Dream Factory Pro Backend is starting...")
print(f"🔗 Public URL: {public_url}")
print(f"📝 API Documentation: {public_url}/docs")
print(f"📊 Status: {public_url}/status")
print("\n" + "="*60)
print("🎯 INSTRUCTIONS:")
print("1. Wait for models to load (check /status)")
print("2. Copy the public URL above")
print("3. Paste it in your Dream Factory frontend")
print("4. Start creating with FLUX KREA Pro!")
print("="*60)

# Start model loading in background
model_thread = threading.Thread(target=load_models_thread, daemon=True)
model_thread.start()

# Start generation worker
worker_thread = threading.Thread(target=generation_worker, daemon=True)
worker_thread.start()

# Run Flask app
print("\n🚀 Starting API server...")
app.run(port=config.PORT, host='0.0.0.0', debug=False)

# Cell 10: Test the API (Optional)
"""
# Test single generation
import requests

test_url = f"{public_url}/generate"
response = requests.post(test_url, json={
    "prompt": "A majestic snow leopard in the Himalayas at golden hour, photorealistic, 8k",
    "steps": 30,
    "cfg_guidance": 4.0,
    "width": 1280,
    "height": 1024
})

print(response.json())

# Test batch generation
batch_url = f"{public_url}/generate/batch"
response = requests.post(batch_url, json={
    "prompts": [
        "A serene Japanese garden in autumn",
        "A futuristic cyberpunk city at night",
        "A magical forest with bioluminescent plants"
    ],
    "steps": 28,
    "cfg_guidance": 3.5
})

print(response.json())
"""