FROM mcr.microsoft.com/devcontainers/python:3.10

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Create workspace directory
RUN mkdir -p /workspace && chown vscode:vscode /workspace

# Switch to vscode user
USER vscode

# Set working directory
WORKDIR /workspace

# Pre-install only lightweight packages
RUN pip install --user --no-cache-dir \
    fastapi \
    uvicorn \
    pydantic \
    pillow \
    python-multipart \
    nest-asyncio \
    pyngrok

# Set environment variables
ENV PATH="/home/vscode/.local/bin:${PATH}"
ENV PYTHONPATH="/workspace:${PYTHONPATH}"
ENV FORCE_CPU=true