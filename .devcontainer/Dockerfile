FROM mcr.microsoft.com/devcontainers/universal:2-linux

# Install Python 3.10
RUN sudo apt-get update && sudo apt-get install -y \
    python3.10 \
    python3.10-venv \
    python3.10-dev \
    python3-pip \
    build-essential \
    curl \
    git \
    && sudo rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default
RUN sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 && \
    sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1

# Install Node.js 18 (if not already installed)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
    sudo apt-get install -y nodejs

# Create workspace directory
RUN sudo mkdir -p /workspace && sudo chown vscode:vscode /workspace

# Switch to vscode user
USER vscode

# Set working directory
WORKDIR /workspace

# Pre-install some Python packages to speed up startup
RUN pip install --user \
    fastapi \
    uvicorn \
    torch \
    diffusers \
    transformers \
    accelerate

# Set environment variables
ENV PATH="/home/vscode/.local/bin:${PATH}"
ENV PYTHONPATH="/workspace:${PYTHONPATH}"