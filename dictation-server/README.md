# Radiology Dictation Server (MVP1)

Offline Whisper transcription with a domain dictionary. One endpoint:
`POST /transcribe` — audio in, text out.

## Run locally

```bash
cd dictation-server
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

uvicorn main:app --reload --port 8000
```

**First request will be slow** (~30–60s) while Whisper downloads the
model (~140 MB for `base`). Subsequent requests are fast.

## Test

```bash
# Health check
curl http://localhost:8000/health

# Transcribe an audio file
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@test.wav" \
  -F "language=en" \
  -F "correct=true"
```

## Configuration

All settings via `.env` (see `.env.example`):

| Variable | Default | Notes |
|---|---|---|
| `WHISPER_MODEL` | `base` | `tiny`/`base` for CPU; `medium`/`large-v3` for GPU |
| `WHISPER_DEVICE` | `cpu` | `cpu` or `cuda` |
| `WHISPER_COMPUTE_TYPE` | `int8` | `int8` (CPU), `float16` (GPU) |
| `CORS_ORIGINS` | localhost only | Add production frontend URL when deploying |
| `MAX_AUDIO_SIZE_MB` | `25` | Reject larger uploads with 413 |
| `DEFAULT_LANGUAGE` | `en` | Used when client doesn't specify |

## Concurrency

Whisper is not thread-safe. Transcription is serialised via an
`asyncio.Lock`. Fine for solo use. For multi-user deployments, run
multiple instances behind a load balancer.

## Domain dictionaries

In `data/radiology_terms_{en,pl,de}.json`. Three correction passes:

1. **Number patterns** (`"two centimeter"` → `"2 cm"`)
2. **Exact misheard variants** (`"hippo campus"` → `"hippocampus"`)
3. **Abbreviations** (`"centimeter"` → `"cm"`)
4. **Fuzzy match** (rapidfuzz, score ≥ 88, words ≥ 5 chars)

Polish and German dictionaries ship nearly empty. Grow them from
observed mistakes after a week of real use.

## What this server does NOT do

By design — these are handled client-side or deferred:

- LLM polish → use the existing `AIReportRefinementModal` in the React app
- Streaming (WebSocket) → MVP1 is segment-mode (HTTP) only
- Training data collection → deferred until consent/governance is in place
- Metrics dashboard, fine-tuning, clinical analytics → not in scope
