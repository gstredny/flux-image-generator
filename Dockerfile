# Multi-stage Dockerfile for the image generator app

# Backend stage
FROM python:3.10-slim as backend

WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/colab-integration/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/colab-integration/ ./

# Frontend build stage
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Final stage - combine everything
FROM python:3.10-slim

WORKDIR /app

# Install nginx for serving frontend
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy backend from backend stage
COPY --from=backend /app/backend /app/backend
COPY --from=backend /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages

# Copy frontend build from frontend-build stage
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 80 7860

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]