# Alpha-Orion Python Scanners Dockerfile
# Optimized for ML-based arbitrage scanners with GPU support

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies for ML and crypto
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    libssl-dev \
    libffi-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install NVIDIA CUDA runtime (optional, for GPU support)
# Uncomment the following lines if GPU support is needed
# RUN apt-get update && apt-get install -y \
#     nvidia-cuda-toolkit \
#     && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r scanner && useradd -r -g scanner scanner

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY backend-services/services/brain-ai-optimization-orchestrator/src/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install additional ML dependencies
RUN pip install --no-cache-dir \
    tensorflow==2.13.0 \
    torch==2.0.1 \
    scikit-learn==1.3.0 \
    pandas==2.0.3 \
    numpy==1.24.3 \
    websockets==11.0.3 \
    aiohttp==3.8.5

# Copy scanner code
COPY backend-services/services/brain-ai-optimization-orchestrator/src/ ./

# Create logs and data directories
RUN mkdir -p /app/logs /app/data /app/models && \
    chown -R scanner:scanner /app

# Switch to non-root user
USER scanner

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=3 \
    CMD python -c "import asyncio; from arbitrage_signal_generator import ArbitrageScanner; print('Scanner healthy')" || exit 1

# Expose port (will be overridden in docker-compose)
EXPOSE 8080

# Default command (will be overridden for specific scanners)
CMD ["python", "main.py"]
