# Google Colab Setup Guide

This guide provides detailed instructions for setting up the FLUX Krea Image Generator on Google Colab.

## Why Use Google Colab?

- **Free GPU Access**: Get access to NVIDIA T4 GPU for free
- **No Installation**: Everything runs in the cloud
- **Easy Setup**: Just run the notebook cells
- **Accessible Anywhere**: Access from any device with a browser

## Prerequisites

- Google account
- Basic understanding of Jupyter notebooks
- Stable internet connection

## Step-by-Step Setup

### 1. Access the Notebook

1. Navigate to `backend/colab-integration/flux_krea_notebook.ipynb`
2. Click "Open in Colab" button or upload to Google Drive
3. Sign in to your Google account if prompted

### 2. Enable GPU Runtime

**Important**: This step is crucial for performance!

1. In Colab, go to **Runtime** → **Change runtime type**
2. Set the following:
   - **Runtime type**: Python 3
   - **Hardware accelerator**: GPU
   - **GPU type**: T4 (or any available)
3. Click **Save**

To verify GPU is enabled:
```python
import torch
print(f"GPU Available: {torch.cuda.is_available()}")
print(f"GPU Name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU'}")
```

### 3. Run the Setup Cells

Run each cell in order:

1. **Install Dependencies** (Cell 1)
   - Installs required Python packages
   - Takes 1-2 minutes

2. **Import Libraries** (Cell 2)
   - Loads necessary modules
   - Should complete instantly

3. **Configure Device** (Cell 3)
   - Sets up GPU/CPU usage
   - Verifies hardware availability

4. **Load Model** (Cell 4)
   - Downloads FLUX model (~7GB on first run)
   - Takes 5-15 minutes first time
   - Subsequent runs use cached model

### 4. Configure ngrok (Optional but Recommended)

ngrok provides a stable public URL for your API.

#### Option A: Use Free ngrok

Just run the server cell - it will create a random URL.

#### Option B: Use ngrok Auth Token (Recommended)

1. Sign up at [ngrok.com](https://dashboard.ngrok.com/signup)
2. Get your auth token from the dashboard
3. Add to the notebook:

```python
import ngrok
ngrok.set_auth_token("YOUR_AUTH_TOKEN_HERE")
```

Benefits:
- Longer session timeout
- Custom subdomain (paid plans)
- Better stability

### 5. Start the API Server

Run the final cell to start the server:

```python
# This will display your public URL
public_url = ngrok.connect(7860)
print(f"Public URL: {public_url}")
```

You'll see output like:
```
🚀 API is running!
📱 Public URL: https://abc123.ngrok.io
🔧 Use this URL in your frontend application
📝 API Documentation: https://abc123.ngrok.io/docs
```

### 6. Configure Frontend

Copy the ngrok URL and add it to your frontend `.env` file:

```env
VITE_API_ENDPOINT=https://abc123.ngrok.io
```

Restart your frontend development server to apply changes.

## Colab Pro Tips

### Keep Session Alive

Free Colab sessions timeout after ~90 minutes of inactivity. To prevent this:

```javascript
// Run this in browser console
function keepAlive() {
  console.log("Keeping Colab alive...");
  document.querySelector('#connect')?.click();
}
setInterval(keepAlive, 60000); // Click every minute
```

### Save Model to Google Drive

To avoid re-downloading the model:

```python
from google.colab import drive
drive.mount('/content/drive')

# Set cache directory to Google Drive
import os
os.environ['HF_HOME'] = '/content/drive/MyDrive/huggingface-cache'
```

### Monitor GPU Usage

```python
# GPU memory usage
!nvidia-smi

# Continuous monitoring
!watch -n 1 nvidia-smi
```

### Handle Disconnections

Add reconnection logic to your notebook:

```python
import time
import subprocess

def ensure_ngrok_running():
    try:
        # Check if ngrok is running
        result = subprocess.run(['pgrep', 'ngrok'], capture_output=True)
        if result.returncode != 0:
            print("ngrok disconnected, restarting...")
            restart_server()
    except:
        pass

# Check every 5 minutes
while True:
    ensure_ngrok_running()
    time.sleep(300)
```

## Colab Limitations

### Free Tier Limitations

- **GPU Time**: ~12 hours/day
- **Session Length**: ~12 hours max
- **Idle Timeout**: ~90 minutes
- **Memory**: 12-15GB RAM
- **Storage**: 70GB disk space

### Solutions

1. **Colab Pro** ($10/month)
   - Priority GPU access
   - Longer runtimes
   - More RAM

2. **Colab Pro+** ($50/month)
   - Background execution
   - Even more resources

3. **Alternative Free Options**
   - Kaggle Notebooks
   - Paperspace Gradient
   - SageMaker Studio Lab

## Troubleshooting

### Common Issues

**1. "No GPU available"**
- Change runtime type to GPU
- Try disconnecting and reconnecting
- GPU might be unavailable due to high demand

**2. "Out of memory" errors**
```python
# Clear GPU cache
torch.cuda.empty_cache()

# Enable CPU offload
pipe.enable_model_cpu_offload()
```

**3. "Session crashed" errors**
- Reduce batch size
- Use smaller image resolutions
- Restart runtime and try again

**4. ngrok connection issues**
- Restart the server cell
- Use auth token for stability
- Check if ngrok is blocked in your region

### Performance Optimization

1. **Use Lower Resolution for Testing**
```python
# Start with 512x512 for testing
width, height = 512, 512
```

2. **Reduce Steps for Faster Generation**
```python
# Use 20 steps instead of 30-50
num_inference_steps = 20
```

3. **Enable Optimizations**
```python
# Memory efficient attention
pipe.enable_attention_slicing()

# Use half precision
pipe = pipe.to(torch.float16)
```

## Security Best Practices

1. **Don't Share Your ngrok URL Publicly**
   - Anyone with the URL can use your GPU quota
   - Regenerate URL if compromised

2. **Add Authentication** (optional)
```python
from fastapi import Depends, HTTPException, security

api_key = security.APIKeyHeader(name="X-API-Key")

async def verify_key(key: str = Depends(api_key)):
    if key != "your-secret-key":
        raise HTTPException(status_code=403)

# Add to endpoints
@app.post("/generate", dependencies=[Depends(verify_key)])
```

3. **Monitor Usage**
   - Check Colab usage in your Google account
   - Set up logging for API requests

## Next Steps

1. Test the API using the provided test cell
2. Build and deploy your frontend
3. Consider upgrading to Colab Pro for production use
4. Explore model fine-tuning options