# Deployment Guide

This guide covers deploying the FLUX Krea Image Generator to production environments.

## Table of Contents

1. [Frontend Deployment](#frontend-deployment)
2. [Backend Deployment](#backend-deployment)
3. [Full Stack Deployment](#full-stack-deployment)
4. [Performance Optimization](#performance-optimization)
5. [Monitoring & Maintenance](#monitoring--maintenance)

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Build and Deploy**
```bash
cd frontend
npm run build
vercel --prod
```

3. **Configure Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add `VITE_API_ENDPOINT` with your backend URL

4. **Custom Domain** (optional)
   - Add your domain in Vercel Dashboard → Domains

### Option 2: Netlify

1. **Build the Project**
```bash
cd frontend
npm run build
```

2. **Deploy via UI**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `dist` folder
   - Configure environment variables in Site Settings

3. **Deploy via CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option 3: GitHub Pages

1. **Install gh-pages**
```bash
npm install --save-dev gh-pages
```

2. **Update package.json**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://yourusername.github.io/flux-krea-app"
}
```

3. **Deploy**
```bash
npm run deploy
```

### Option 4: Docker

1. **Create Dockerfile**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. **Create nginx.conf**
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (optional)
    location /api {
        proxy_pass http://backend:7860;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Build and Run**
```bash
docker build -t flux-krea-frontend .
docker run -p 80:80 flux-krea-frontend
```

## Backend Deployment

### Option 1: Cloud GPU Providers

#### RunPod

1. **Create RunPod Account**
   - Sign up at [runpod.io](https://runpod.io)
   - Add credits to your account

2. **Create Pod**
   - Choose GPU (RTX 3090 or better recommended)
   - Select PyTorch template
   - Configure storage (20GB minimum)

3. **Deploy Script**
```bash
#!/bin/bash
# Save as deploy.sh

# Clone repository
git clone <your-repo-url> /workspace/flux-krea

# Install dependencies
cd /workspace/flux-krea/backend/colab-integration
pip install -r requirements.txt

# Download model (do this once)
python -c "from diffusers import FluxPipeline; FluxPipeline.from_pretrained('black-forest-labs/FLUX.1-schnell')"

# Run server
python flux_krea_api.py --host 0.0.0.0 --port 7860
```

4. **Configure Public Access**
   - Use RunPod's proxy URL
   - Or set up ngrok in the pod

#### Paperspace Gradient

1. **Create Notebook**
   - Choose GPU machine (P4000 or better)
   - Select PyTorch runtime

2. **Upload Code**
   - Upload backend files
   - Install dependencies

3. **Run Server**
   - Execute `flux_krea_api.py`
   - Use Gradient's public URL feature

### Option 2: Self-Hosted GPU Server

1. **System Requirements**
   - Ubuntu 20.04+ or similar
   - NVIDIA GPU with 8GB+ VRAM
   - CUDA 11.8+ installed
   - 20GB+ storage

2. **Setup Script**
```bash
#!/bin/bash
# Ubuntu GPU server setup

# Install NVIDIA drivers
sudo apt update
sudo apt install nvidia-driver-525

# Install CUDA
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt update
sudo apt install cuda

# Install Python 3.10
sudo apt install python3.10 python3.10-venv

# Clone and setup
git clone <your-repo-url> /opt/flux-krea
cd /opt/flux-krea/backend/colab-integration

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Create systemd service
sudo tee /etc/systemd/system/flux-krea.service > /dev/null <<EOF
[Unit]
Description=FLUX Krea API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/flux-krea/backend/colab-integration
Environment="PATH=/opt/flux-krea/backend/colab-integration/venv/bin"
ExecStart=/opt/flux-krea/backend/colab-integration/venv/bin/python flux_krea_api.py --host 0.0.0.0 --port 7860
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl enable flux-krea
sudo systemctl start flux-krea
```

3. **Configure Reverse Proxy (nginx)**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:7860;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

4. **SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Option 3: Docker Deployment

1. **Create Backend Dockerfile**
```dockerfile
# backend/Dockerfile
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY colab-integration/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY colab-integration/ .

# Download model at build time (optional)
# RUN python -c "from diffusers import FluxPipeline; FluxPipeline.from_pretrained('black-forest-labs/FLUX.1-schnell')"

EXPOSE 7860

CMD ["python", "flux_krea_api.py", "--host", "0.0.0.0", "--port", "7860"]
```

2. **Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_ENDPOINT=http://backend:7860
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "7860:7860"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    volumes:
      - model-cache:/root/.cache/huggingface

volumes:
  model-cache:
```

3. **Deploy**
```bash
docker-compose up -d
```

## Full Stack Deployment

### Option 1: AWS EC2 with GPU

1. **Launch Instance**
   - Choose p3.2xlarge or g4dn.xlarge
   - Select Deep Learning AMI
   - Configure security groups

2. **Setup Script**
```bash
#!/bin/bash
# Full stack deployment on AWS

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install NVIDIA Docker
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt update && sudo apt install -y nvidia-docker2
sudo systemctl restart docker

# Clone and deploy
git clone <your-repo-url> /opt/flux-krea
cd /opt/flux-krea
docker-compose up -d
```

### Option 2: Kubernetes Deployment

1. **Create Kubernetes Manifests**
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flux-krea-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flux-krea-backend
  template:
    metadata:
      labels:
        app: flux-krea-backend
    spec:
      containers:
      - name: backend
        image: your-registry/flux-krea-backend:latest
        ports:
        - containerPort: 7860
        resources:
          limits:
            nvidia.com/gpu: 1
---
apiVersion: v1
kind: Service
metadata:
  name: flux-krea-backend
spec:
  selector:
    app: flux-krea-backend
  ports:
  - port: 7860
    targetPort: 7860
```

2. **Deploy to Kubernetes**
```bash
kubectl apply -f k8s/
```

## Performance Optimization

### Frontend Optimization

1. **Enable Compression**
```javascript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default {
  plugins: [
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
};
```

2. **Optimize Images**
   - Use WebP format
   - Implement lazy loading
   - Use CDN for static assets

3. **PWA Support**
```javascript
// Add vite-plugin-pwa
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'FLUX Krea Generator',
        short_name: 'FLUX',
        theme_color: '#0ea5e9',
      },
    }),
  ],
};
```

### Backend Optimization

1. **Model Optimization**
```python
# Use torch.compile for faster inference (PyTorch 2.0+)
pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead", fullgraph=True)

# Enable mixed precision
pipe.enable_vae_slicing()
pipe.enable_vae_tiling()
```

2. **Caching Strategy**
```python
from functools import lru_cache
import redis

# Redis caching for generated images
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_image(prompt_hash, image_data):
    redis_client.setex(prompt_hash, 3600, image_data)  # 1 hour TTL

def get_cached_image(prompt_hash):
    return redis_client.get(prompt_hash)
```

3. **Load Balancing**
```nginx
upstream backend {
    least_conn;
    server backend1:7860;
    server backend2:7860;
    server backend3:7860;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

## Monitoring & Maintenance

### Monitoring Setup

1. **Application Monitoring**
```python
# Add Prometheus metrics
from prometheus_client import Counter, Histogram, generate_latest

request_count = Counter('flux_requests_total', 'Total requests')
request_duration = Histogram('flux_request_duration_seconds', 'Request duration')

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

2. **System Monitoring**
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

3. **Logging**
```python
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    handlers=[
        RotatingFileHandler(
            "flux_krea.log",
            maxBytes=10485760,  # 10MB
            backupCount=5
        )
    ],
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s"
)
```

### Maintenance Tasks

1. **Automated Backups**
```bash
#!/bin/bash
# backup.sh - Run daily via cron

# Backup generated images
aws s3 sync /var/lib/flux-krea/images s3://your-bucket/backups/images/

# Backup database (if using)
pg_dump flux_krea | gzip > flux_krea_$(date +%Y%m%d).sql.gz
aws s3 cp flux_krea_*.sql.gz s3://your-bucket/backups/db/
```

2. **Update Script**
```bash
#!/bin/bash
# update.sh - Update application

cd /opt/flux-krea
git pull origin main

# Update frontend
cd frontend
npm install
npm run build

# Update backend
cd ../backend/colab-integration
source venv/bin/activate
pip install -r requirements.txt

# Restart services
sudo systemctl restart flux-krea
sudo systemctl restart nginx
```

3. **Health Checks**
```bash
#!/bin/bash
# healthcheck.sh - Run every 5 minutes

API_URL="http://localhost:7860/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "API health check failed"
    # Send alert (email, Slack, etc.)
    # Attempt restart
    sudo systemctl restart flux-krea
fi
```

## Security Considerations

1. **API Authentication**
```python
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import JWTAuthentication

# Add user authentication
auth_backend = JWTAuthentication(secret=SECRET, lifetime_seconds=3600)
```

2. **Rate Limiting**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/generate")
@limiter.limit("10/minute")
async def generate_image(request: GenerateRequest):
    # ...
```

3. **Input Validation**
```python
from better_profanity import profanity

def validate_prompt(prompt: str):
    if profanity.contains_profanity(prompt):
        raise HTTPException(status_code=400, detail="Inappropriate content")
    if len(prompt) > 1000:
        raise HTTPException(status_code=400, detail="Prompt too long")
```

## Cost Optimization

1. **Spot Instances** (AWS)
```bash
# Use spot instances for 70% cost savings
aws ec2 request-spot-instances --spot-price "0.50" --instance-count 1 --type "one-time" --launch-specification file://spot-spec.json
```

2. **Auto-scaling**
```yaml
# k8s HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: flux-krea-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: flux-krea-backend
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: gpu
      target:
        type: Utilization
        averageUtilization: 80
```

3. **CDN for Static Assets**
   - Use Cloudflare or AWS CloudFront
   - Cache generated images for repeated requests
   - Serve frontend assets from edge locations