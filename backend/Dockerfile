FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY colab-integration/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY colab-integration/ ./

# Create a non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose the API port
EXPOSE 7860

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MODEL_CACHE_DIR=/app/.cache

# Run the application
CMD ["python", "flux_krea_api.py", "--host", "0.0.0.0", "--port", "7860"]