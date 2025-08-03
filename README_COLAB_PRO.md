# FLUX KREA Pro - Google Colab Pro Setup Guide

This guide helps you set up and run the FLUX KREA image generation system with T5-XXL text encoder on Google Colab Pro.

## 🚀 Quick Start

### 1. Upload Files to Google Drive

First, upload the backend files to your Google Drive:
```
My Drive/
└── image-generator/
    └── backend/
        └── colab-integration/
            ├── flux_krea_colab_pro.py
            ├── flux_krea_api_pro.py
            └── flux_krea_pro_notebook.ipynb
```

### 2. Open the Notebook in Colab Pro

1. Go to [Google Colab](https://colab.research.google.com)
2. Sign in with your Google account
3. Click **File → Open notebook**
4. Navigate to **Google Drive → image-generator → backend → colab-integration**
5. Open `flux_krea_pro_notebook.ipynb`
6. Ensure you're using **Colab Pro** with a high-RAM GPU (A100 or V100 preferred)

### 3. Run the Setup

Execute the cells in order:

1. **Mount Google Drive** - Gives access to your files
2. **Install Dependencies** - Installs required packages (~5 minutes)
3. **Load Models** - Loads FLUX KREA with T5-XXL (~3-5 minutes)
4. **Start API Server** - Launches the server with ngrok tunnel

### 4. Connect Your Frontend

After the API server starts, you'll see:
```
Public URL: https://[your-id].ngrok.io
```

Copy this URL and update your frontend:
1. Open your frontend application
2. Go to Settings (gear icon)
3. Paste the ngrok URL as the API endpoint
4. Click Save

## 🎨 Features

### T5-XXL Text Encoder
- **11 billion parameters** for superior prompt understanding
- Handles complex, nuanced descriptions
- Better at following specific instructions
- Supports up to 512 tokens per prompt

### Batch Generation
- Generate up to 4 images simultaneously
- Real-time progress tracking for each image
- Queue-based processing for efficiency
- Automatic retry on failures

### Performance Optimizations
- **xFormers**: 50% memory reduction
- **VAE Slicing**: Enables HD image generation
- **Mixed Precision**: Faster computation
- **CPU Offloading**: Handles memory spikes

## 💻 System Requirements

### Minimum (Colab Pro)
- GPU: T4 (16GB VRAM)
- RAM: 25GB system memory
- Storage: 50GB free space

### Recommended (Colab Pro+)
- GPU: A100 (40GB VRAM) or V100 (16GB VRAM)
- RAM: 50GB+ system memory
- Storage: 100GB free space

## 🔧 Configuration Options

### Model Loading Options

```python
# In flux_krea_colab_pro.py, you can adjust:

class Config:
    # Use CPU offload for low memory (slower but works on T4)
    ENABLE_CPU_OFFLOAD = True
    
    # Use xFormers for memory efficiency
    ENABLE_XFORMERS = True
    
    # Use VAE slicing for HD images
    ENABLE_VAE_SLICING = True
    
    # Queue size for batch processing
    MAX_QUEUE_SIZE = 10
```

### Generation Parameters

- **Steps**: 20-50 (default: 30)
- **CFG Scale**: 1.0-20.0 (default: 7.5)
- **Resolution**: 512-2048px (default: 1024x1024)
- **Batch Size**: 1-4 prompts

## 🚨 Troubleshooting

### "Out of Memory" Error
1. Ensure xFormers is enabled
2. Reduce image resolution
3. Lower batch size to 1
4. Restart runtime and try again

### "Models Still Loading"
- First load takes 3-5 minutes
- Check the progress in the notebook output
- T5-XXL is large (11B parameters) and takes time

### "Connection Refused"
1. Check ngrok is running (look for public URL)
2. Verify you copied the complete URL
3. Ensure Colab session is still active

### "Slow Generation"
- T4 GPUs are slower (60-90s per image)
- A100/V100 are faster (20-30s per image)
- First generation is always slower (model warmup)

## 📊 Performance Expectations

### Generation Times (1024x1024, 30 steps)
- **A100**: ~20 seconds per image
- **V100**: ~30 seconds per image
- **T4**: ~60-90 seconds per image

### Memory Usage
- **Model Loading**: ~25GB peak
- **Generation**: ~10-15GB per image
- **With Optimizations**: ~7-10GB per image

## 🔄 Session Management

### Keeping Session Alive
- Colab Pro sessions last up to 24 hours
- Keep the browser tab open
- Run a cell every ~30 minutes to prevent timeout

### Saving Your Work
- Generated images are saved to `/content/outputs/`
- Download important images before session ends
- Consider saving to Google Drive for persistence

## 🎯 Best Practices

### Prompt Engineering with T5-XXL
1. **Be Specific**: T5-XXL excels at detailed descriptions
2. **Use Natural Language**: Write prompts like sentences
3. **Include Style**: Mention artistic style, lighting, mood
4. **Avoid Negatives**: Focus on what you want, not what to avoid

### Example Prompts
```
"A majestic dragon perched on a crystal mountain peak at sunset, 
wings spread wide, scales shimmering with iridescent colors, 
painted in the style of classical fantasy art with dramatic lighting"

"Futuristic cyberpunk street market in Tokyo at night, neon signs 
reflecting in puddles, holographic advertisements floating above 
crowded stalls, ultra detailed, cinematic composition"
```

### Batch Generation Tips
- Use variations of a theme for consistency
- Test parameters with single images first
- Monitor progress to catch issues early
- Save successful parameters for reuse

## 📝 Advanced Usage

### Using the Python Script Directly

For more control, you can use the Python script instead of the notebook:

```python
# In a Colab cell:
!python /content/drive/MyDrive/image-generator/backend/colab-integration/flux_krea_colab_pro.py
```

### Custom Model Configuration

Edit the model manager for different settings:

```python
# In flux_krea_colab_pro.py
pipeline = FluxPipeline.from_pretrained(
    "black-forest-labs/FLUX.1-dev",
    text_encoder=t5_encoder,
    text_encoder_2=clip_encoder,
    torch_dtype=torch.bfloat16,  # Change to float16 for older GPUs
    variant="fp16",
)
```

## 🤝 Contributing

Found an issue or have an improvement? Please:
1. Check existing issues on GitHub
2. Create a detailed bug report or feature request
3. Include your Colab Pro GPU type and any error messages

## 📄 License

This project uses the FLUX.1 [dev] model from Black Forest Labs. Please review their license terms for commercial use.

---

Happy generating! 🎨✨