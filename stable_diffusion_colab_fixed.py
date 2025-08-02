# George's Dream Factory - Stable Diffusion Backend for Google Colab
# FIXED VERSION - Copy this entire file into a new Google Colab notebook

# Cell 1: Install Dependencies
!pip install flask flask-cors pyngrok diffusers transformers accelerate -q
!pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 -q

# Cell 2: Imports and Setup
import os
import base64
import io
import json
import threading
import time
from datetime import datetime

import torch
from diffusers import StableDiffusionPipeline
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
from PIL import Image

print("🌟 GEORGE'S DREAM FACTORY - STABLE DIFFUSION EDITION 🌟")
print("=" * 50)

# Cell 3: Create Flask App First
app = Flask(__name__)
CORS(app, origins="*", allow_headers="*", methods=["GET", "POST", "OPTIONS"])

# Global variables
model_loaded = False
pipe = None
model_loading = False

# Cell 4: Define Routes
@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({
        'message': 'George\'s Dream Factory API',
        'endpoints': ['/health', '/status', '/generate', '/models'],
        'model_loaded': model_loaded
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if model_loaded else 'loading',
        'model': 'stable-diffusion-v1-5',
        'version': '1.0',
        'device': 'cuda' if torch.cuda.is_available() else 'cpu',
        'gpu_available': torch.cuda.is_available()
    })

@app.route('/status', methods=['GET'])
def status_check():
    """Status check endpoint"""
    return jsonify({
        'status': 'ready' if model_loaded else 'loading',
        'model_loaded': model_loaded,
        'models_loaded': model_loaded,  # For compatibility
        'models_loading': model_loading,
        'message': 'Model is ready!' if model_loaded else 'Model is loading, please wait...',
        'device': 'cuda' if torch.cuda.is_available() else 'cpu',
        'gpu_available': torch.cuda.is_available()
    })

@app.route('/generate', methods=['POST'])
def generate_image():
    """Generate image endpoint"""
    global pipe, model_loaded
    
    if not model_loaded:
        return jsonify({
            'success': False,
            'error': 'Model is still loading. Please wait a moment and try again.'
        }), 503
    
    try:
        # Get parameters from request
        data = request.json
        prompt = data.get('prompt', '')
        steps = data.get('steps', 30)
        cfg_guidance = data.get('cfg_guidance', 7.5)
        seed = data.get('seed', -1)
        width = data.get('width', 512)
        height = data.get('height', 512)
        
        # Validate parameters
        if not prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt is required'
            }), 400
        
        # Limit dimensions for stability
        width = min(max(width, 256), 768)
        height = min(max(height, 256), 768)
        
        # Make dimensions divisible by 8 (required by SD)
        width = (width // 8) * 8
        height = (height // 8) * 8
        
        # Set random seed if not provided
        if seed == -1:
            seed = torch.randint(0, 1000000, (1,)).item()
        
        print(f"🎨 Generating image: '{prompt[:50]}...'")
        print(f"   Steps: {steps}, Guidance: {cfg_guidance}, Seed: {seed}")
        print(f"   Dimensions: {width}x{height}")
        
        # Generate image
        generator = torch.Generator(device="cuda").manual_seed(seed)
        
        with torch.no_grad():
            image = pipe(
                prompt=prompt,
                num_inference_steps=int(steps),
                guidance_scale=float(cfg_guidance),
                generator=generator,
                height=height,
                width=width
            ).images[0]
        
        # Convert to base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        print("✅ Image generated successfully!")
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_base64}',
            'seed': seed,
            'prompt': prompt,
            'parameters': {
                'steps': steps,
                'cfg_guidance': cfg_guidance,
                'width': width,
                'height': height
            }
        })
        
    except Exception as e:
        print(f"❌ Generation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Generation failed: {str(e)}'
        }), 500

@app.route('/models', methods=['GET'])
def get_models():
    """Get available models endpoint"""
    return jsonify({
        'models': ['stable-diffusion-v1-5']
    })

# Cell 5: Load Model
print("🔄 Loading Stable Diffusion v1.5...")
print("This will take 2-3 minutes on the first run...")

def load_model():
    global pipe, model_loaded, model_loading
    try:
        model_loading = True
        pipe = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16,
            safety_checker=None,
            requires_safety_checker=False
        )
        
        # Move to GPU
        pipe = pipe.to("cuda")
        
        # Enable memory efficient attention
        pipe.enable_attention_slicing()
        
        model_loaded = True
        model_loading = False
        print("✅ Stable Diffusion loaded successfully!")
        print(f"💾 Model is using GPU: {torch.cuda.is_available()}")
        print(f"🎮 GPU Name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU'}")
        
    except Exception as e:
        print(f"❌ Error loading model: {str(e)}")
        model_loaded = False
        model_loading = False

# Start loading model in background
model_thread = threading.Thread(target=load_model)
model_thread.start()

# Cell 6: Setup Ngrok and Start Server
print("\n🌐 Setting up public access with ngrok...")

# Your ngrok auth token (replace with yours)
ngrok_token = "30iV3q8uaQdyP8d6zaWKoMYgtz2_Bq6wtcF7DrrgRgv2zmjZ"

# Set up ngrok
ngrok.set_auth_token(ngrok_token)

# Create tunnel
tunnel = ngrok.connect(5000)
public_url = tunnel.public_url

print(f"\n🚀 Your Dream Factory Backend is live at: {public_url}")
print(f"📋 Copy this URL and paste it in your Dream Factory settings!")
print("\n" + "="*50)
print("🎯 INSTRUCTIONS:")
print("1. Copy the URL above")
print("2. Open your Dream Factory at: https://georges-dream-factory-*.vercel.app")
print("3. Click the Settings icon (gear)")
print("4. Paste the ngrok URL")
print("5. Click 'Save URL' then 'Test Connection'")
print("6. Start creating dreams! 🎨")
print("="*50)

# Test endpoints
print("\n📡 Test these endpoints:")
print(f"   Root: {public_url}/")
print(f"   Health: {public_url}/health")
print(f"   Status: {public_url}/status")

# Wait for model to load before allowing generation
print("\n⏳ Waiting for model to finish loading...")
model_thread.join()

if model_loaded:
    print("\n✅ Model loaded! Server is ready!")
    print("🏭 GEORGE'S DREAM FACTORY IS READY!")
    print("="*50)
else:
    print("\n⚠️  Model failed to load but server will still run")
    print("Check the error messages above")

# Run Flask app
print("\n🚀 Starting Flask server...")
app.run(port=5000, host='0.0.0.0')