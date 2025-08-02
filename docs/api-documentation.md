# API Documentation

Complete API reference for the FLUX Krea Image Generator backend service.

## Base URL

```
Development: http://localhost:7860
Production: https://your-api-domain.com
```

## Authentication

Currently, the API is open. For production, implement one of these methods:

### API Key Authentication
```http
X-API-Key: your-secret-api-key
```

### Bearer Token
```http
Authorization: Bearer your-jwt-token
```

## Endpoints

### Health Check

Check if the API server is running and the model is loaded.

```http
GET /health
```

#### Response

```json
{
  "status": "healthy",
  "model": "black-forest-labs/FLUX.1-schnell",
  "device": "cuda",
  "version": "1.0.0"
}
```

| Field | Type | Description |
|-------|------|-------------|
| status | string | "healthy" or "unhealthy" |
| model | string | Currently loaded model ID |
| device | string | Computing device ("cuda" or "cpu") |
| version | string | API version |

### Generate Image

Generate an image from a text prompt.

```http
POST /generate
Content-Type: application/json
```

#### Request Body

```json
{
  "prompt": "A majestic mountain landscape at sunset with snow-capped peaks",
  "steps": 30,
  "cfg_scale": 4.0,
  "seed": 42,
  "width": 1024,
  "height": 1024
}
```

| Parameter | Type | Required | Default | Description | Constraints |
|-----------|------|----------|---------|-------------|-------------|
| prompt | string | Yes | - | Text description of the image | Max 1000 chars |
| steps | integer | No | 30 | Number of denoising steps | 20-50 |
| cfg_scale | float | No | 4.0 | Classifier-free guidance scale | 1.0-10.0 |
| seed | integer | No | -1 | Random seed (-1 for random) | -1 or positive integer |
| width | integer | No | 1024 | Image width in pixels | 512-2048, divisible by 8 |
| height | integer | No | 1024 | Image height in pixels | 512-2048, divisible by 8 |

#### Response

##### Success Response (200 OK)

```json
{
  "success": true,
  "image": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "duration": 12.5
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always true for successful generation |
| image | string | Base64-encoded PNG image with data URI prefix |
| duration | float | Generation time in seconds |

##### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "duration": 0.5
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always false for errors |
| error | string | Human-readable error message |
| duration | float | Time until error occurred |

#### Example cURL Request

```bash
curl -X POST http://localhost:7860/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic city with flying cars",
    "steps": 30,
    "cfg_scale": 4.0,
    "seed": -1,
    "width": 1024,
    "height": 1024
  }'
```

### List Models

Get a list of available models.

```http
GET /models
```

#### Response

```json
{
  "models": [
    "black-forest-labs/FLUX.1-schnell",
    "black-forest-labs/FLUX.1-dev"
  ]
}
```

## WebSocket Endpoint (Optional)

For real-time generation progress updates.

```websocket
ws://localhost:7860/ws
```

### Connection

```javascript
const ws = new WebSocket('ws://localhost:7860/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.progress);
};
```

### Messages

#### Client → Server

```json
{
  "type": "generate",
  "data": {
    "prompt": "A beautiful sunset",
    "steps": 30,
    "cfg_scale": 4.0,
    "seed": -1,
    "width": 1024,
    "height": 1024
  }
}
```

#### Server → Client

Progress Update:
```json
{
  "type": "progress",
  "data": {
    "step": 15,
    "total_steps": 30,
    "percentage": 50
  }
}
```

Completion:
```json
{
  "type": "complete",
  "data": {
    "image": "data:image/png;base64,...",
    "duration": 12.5
  }
}
```

Error:
```json
{
  "type": "error",
  "data": {
    "error": "Error message"
  }
}
```

## Error Codes

| HTTP Status | Error Type | Description | Example |
|-------------|------------|-------------|---------|
| 400 | Bad Request | Invalid parameters | Steps out of range |
| 401 | Unauthorized | Missing or invalid auth | Invalid API key |
| 422 | Validation Error | Request validation failed | Missing required field |
| 429 | Rate Limited | Too many requests | Exceeded quota |
| 500 | Server Error | Internal server error | Model loading failed |
| 503 | Service Unavailable | Server overloaded | GPU memory full |

## Rate Limiting

Default rate limits (configurable):

- **Anonymous**: 10 requests/minute, 100 requests/hour
- **Authenticated**: 30 requests/minute, 500 requests/hour
- **Pro**: 60 requests/minute, 2000 requests/hour

Rate limit headers:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
```

## Best Practices

### 1. Prompt Engineering

**Good Prompts**:
- Be specific and descriptive
- Include style, mood, and lighting
- Mention artistic style or medium
- Specify camera angle for photos

**Examples**:
```
✅ "Professional portrait photography of a woman, dramatic lighting, shallow depth of field, shot on 85mm lens"
✅ "Oil painting of a serene lake, impressionist style, soft brushstrokes, morning mist"
❌ "A person"
❌ "Nice picture"
```

### 2. Parameter Guidelines

**Steps**:
- 20-25: Fast, decent quality
- 30-35: Balanced (recommended)
- 40-50: High quality, slower

**CFG Scale**:
- 1.0-3.0: More creative, less prompt adherence
- 3.5-5.0: Balanced (recommended)
- 6.0-10.0: Strict prompt following

**Resolution**:
- Start with 1024x1024 for testing
- Use 512x512 for rapid prototyping
- Maximum 2048x2048 for high detail

### 3. Error Handling

```javascript
async function generateImage(prompt) {
  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Generation failed');
    }
    
    return data.image;
  } catch (error) {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error);
      throw new Error('Unable to connect to server');
    }
    
    // Handle API errors
    throw error;
  }
}
```

### 4. Retry Logic

```javascript
async function generateWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateImage(prompt);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
class FluxKreaClient {
  constructor(private apiUrl: string, private apiKey?: string) {}

  async generate(
    prompt: string,
    options: Partial<GenerateRequest> = {}
  ): Promise<string> {
    const response = await fetch(`${this.apiUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      },
      body: JSON.stringify({
        prompt,
        steps: 30,
        cfg_scale: 4.0,
        seed: -1,
        width: 1024,
        height: 1024,
        ...options
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    return data.image;
  }
}

// Usage
const client = new FluxKreaClient('https://api.example.com');
const image = await client.generate('A cosmic nebula', {
  steps: 40,
  seed: 12345
});
```

### Python

```python
import requests
from typing import Optional, Dict, Any

class FluxKreaClient:
    def __init__(self, api_url: str, api_key: Optional[str] = None):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        
        if api_key:
            self.session.headers['X-API-Key'] = api_key

    def generate(
        self,
        prompt: str,
        steps: int = 30,
        cfg_scale: float = 4.0,
        seed: int = -1,
        width: int = 1024,
        height: int = 1024
    ) -> str:
        """Generate an image from a prompt."""
        
        response = self.session.post(
            f"{self.api_url}/generate",
            json={
                "prompt": prompt,
                "steps": steps,
                "cfg_scale": cfg_scale,
                "seed": seed,
                "width": width,
                "height": height
            }
        )
        
        response.raise_for_status()
        data = response.json()
        
        if not data["success"]:
            raise Exception(data["error"])
        
        return data["image"]

    def health_check(self) -> Dict[str, Any]:
        """Check API health status."""
        response = self.session.get(f"{self.api_url}/health")
        response.raise_for_status()
        return response.json()

# Usage
client = FluxKreaClient("http://localhost:7860")
image_data = client.generate(
    "A serene Japanese garden",
    steps=35,
    seed=42
)

# Save image
import base64
image_bytes = base64.b64decode(image_data.split(",")[1])
with open("generated.png", "wb") as f:
    f.write(image_bytes)
```

### cURL

```bash
# Basic generation
curl -X POST http://localhost:7860/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A magical forest"}'

# With all parameters
curl -X POST http://localhost:7860/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "prompt": "A futuristic spacecraft in deep space",
    "steps": 40,
    "cfg_scale": 5.0,
    "seed": 12345,
    "width": 1280,
    "height": 768
  }' \
  | jq -r '.image' \
  | cut -d',' -f2 \
  | base64 -d > spacecraft.png

# Health check
curl http://localhost:7860/health | jq

# With retry
for i in {1..3}; do
  curl -X POST http://localhost:7860/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt": "A sunset"}' \
    && break || sleep $((i * 2))
done
```

## Performance Tips

1. **Batch Processing**: Send multiple requests in parallel
2. **Caching**: Cache results for identical parameters
3. **Progressive Loading**: Use lower resolution for previews
4. **Connection Pooling**: Reuse HTTP connections
5. **Timeout Handling**: Set appropriate timeouts (60-120s)

## Changelog

### Version 1.0.0 (Initial Release)
- Basic image generation endpoint
- Health check endpoint
- Support for FLUX.1-schnell model
- Configurable parameters
- Base64 image encoding