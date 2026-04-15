# Dictation server — Railway / generic container deployment.
#
# Uses python:3.11-slim for a small base image. faster-whisper pulls
# in ctranslate2 + torch, so the final image is ~2 GB. Whisper model
# itself (~140 MB for `base`) downloads on first request — subsequent
# requests hit a cached copy in ~/.cache/huggingface.

FROM python:3.11-slim

# System deps for faster-whisper / ffmpeg audio decoding
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cached layer if requirements.txt unchanged)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY config.py main.py ./
COPY data ./data

# Railway injects $PORT; default to 8000 locally.
ENV PORT=8000
EXPOSE 8000

# uvicorn binds to 0.0.0.0 so the container accepts external traffic.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
