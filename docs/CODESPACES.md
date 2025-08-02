# GitHub Codespaces Setup Guide

This guide will help you get the FLUX Image Generator running in GitHub Codespaces with zero local setup required.

## 🚀 Quick Start (2 minutes)

1. **Open in Codespaces**
   - Click the green "Code" button on the repository
   - Select "Codespaces" tab
   - Click "Create codespace on main"

2. **Wait for Setup** (2-3 minutes)
   - Codespaces will automatically:
     - Install Python and Node.js
     - Install all dependencies
     - Configure the environment
     - Set up port forwarding

3. **Start the Application**
   ```bash
   npm run dev
   ```
   Or use the helper script:
   ```bash
   ./scripts/start-codespaces.sh
   ```

4. **Access the App**
   - Frontend will auto-open at port 3000
   - Backend API runs on port 7860
   - No manual URL configuration needed!

## 📋 What's Included

### Pre-installed Software
- Python 3.10 with pip
- Node.js 18 with npm
- Git and GitHub CLI
- Docker (for container development)
- Common VS Code extensions

### Automatic Configuration
- Backend API URL auto-configured
- Environment variables set up
- Model caching directory created
- Ports forwarded with HTTPS

### VS Code Extensions
- Python + Pylance
- ESLint + Prettier
- Tailwind CSS IntelliSense
- Docker
- GitHub Copilot (if you have access)

## 🔧 Configuration

### Environment Variables

Codespaces automatically sets:
- `CODESPACE_NAME` - Your codespace identifier
- `GITHUB_TOKEN` - For GitHub API access
- `CODESPACES=true` - Detected by the backend

### Model Configuration

By default, uses `FLUX.1-schnell` (fast model). To change:

```bash
# Edit backend environment
echo "MODEL_ID=black-forest-labs/FLUX.1-dev" >> backend/colab-integration/.env
```

### CPU vs GPU

Codespaces runs on CPU by default. This means:
- First generation: 5-10 minutes (model download)
- Subsequent generations: 2-5 minutes
- Lower resolution recommended (512x512 or 768x768)

For GPU support, use GitHub Codespaces with GPU (paid feature).

## 🛠️ Development Workflow

### Starting Services

**Option 1: Combined (Recommended)**
```bash
npm run dev
```

**Option 2: Separate Terminals**
```bash
# Terminal 1 - Backend
cd backend/colab-integration
python flux_krea_api.py --codespaces

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Making Changes

1. **Frontend Changes**
   - Edit files in `frontend/src/`
   - Changes hot-reload automatically
   - No restart needed

2. **Backend Changes**
   - Edit `backend/colab-integration/flux_krea_api.py`
   - Restart the backend server
   - Frontend reconnects automatically

### Debugging

**Frontend Debugging:**
- Use browser DevTools (F12)
- Check Console for errors
- Network tab shows API calls

**Backend Debugging:**
- Check terminal output
- Logs show all requests
- Add `print()` statements or use debugger

## 📦 Model Management

### First Run
The FLUX model (~6GB) downloads on first image generation. This is cached in:
```
/home/vscode/.cache/huggingface
```

### Clearing Cache
If you need to free space:
```bash
rm -rf ~/.cache/huggingface
```

### Using Different Models
```python
# In backend/.env
MODEL_ID=stabilityai/stable-diffusion-3-medium-diffusers
```

## 🚨 Troubleshooting

### Common Issues

**1. Backend Won't Start**
- Check Python installation: `python --version`
- Reinstall deps: `pip install -r requirements.txt`
- Check logs for specific errors

**2. Frontend Connection Error**
- Verify backend is running
- Check browser console for errors
- Try refreshing the page

**3. Slow Generation**
- Normal on CPU (2-5 minutes)
- Try smaller images (512x512)
- Reduce steps to 20

**4. Out of Memory**
- Codespaces has 8GB RAM limit
- Restart codespace if needed
- Use smaller model or lower resolution

### Port Issues

If ports aren't forwarding:
1. Go to "Ports" tab in VS Code
2. Right-click port 3000 and 7860
3. Select "Port Visibility" → "Public"

### Logs

View logs in the terminal where you started the services. Backend logs are especially helpful for debugging.

## 💡 Tips & Tricks

### Performance Optimization
- Use 512x512 or 768x768 resolution on CPU
- Keep steps at 20-30 for faster generation
- First generation is always slowest (model loading)

### Development Tips
- Use `npm run dev` for automatic restarts
- Keep browser DevTools open
- Check backend logs for generation progress

### Saving Work
- Codespaces auto-saves your work
- Use Git to commit changes
- Codespaces persist for 30 days of inactivity

## 🔗 Useful Links

- [Codespaces Documentation](https://docs.github.com/en/codespaces)
- [VS Code in Codespaces](https://code.visualstudio.com/docs/remote/codespaces)
- [Managing Codespaces](https://docs.github.com/en/codespaces/managing-codespaces-for-your-organization)

## 🆘 Getting Help

If you encounter issues:

1. Check the [main README](../README.md)
2. Look at [GitHub Issues](https://github.com/gstredny/flux-image-generator/issues)
3. Review backend logs for errors
4. Create a new issue with:
   - Error messages
   - Steps to reproduce
   - Browser/OS information

---

Happy generating! 🎨