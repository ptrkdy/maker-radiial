# Maker Robot Server - Docker image for lerobot integration
#
# Build: docker build -t maker-server -f docker/Dockerfile .
# Run:   docker-compose up (see docker-compose.yml)

FROM python:3.11-slim

# Install system dependencies for serial communication and building packages
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    libusb-1.0-0 \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install base Python dependencies first (for caching)
RUN pip install --no-cache-dir \
    flask>=3.0.0 \
    pyserial>=3.5 \
    feetech-servo-sdk \
    draccus \
    numpy \
    pillow \
    opencv-python-headless

# Install PyTorch CPU (smaller image)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install additional lerobot dependencies
RUN pip install --no-cache-dir \
    einops \
    huggingface_hub \
    safetensors \
    omegaconf \
    hydra-core

# Copy the server code
COPY python/server.py /app/server.py
COPY python/requirements.txt /app/requirements.txt

# lerobot will be mounted as a volume at /app/lerobot
# Set Python path
ENV PYTHONPATH=/app/lerobot/src:$PYTHONPATH
ENV MAKER_SERVER_HOST=0.0.0.0
ENV MAKER_SERVER_PORT=5577

EXPOSE 5577

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5577/health')" || exit 1

CMD ["python", "/app/server.py"]
