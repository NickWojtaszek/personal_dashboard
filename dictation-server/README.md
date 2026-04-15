# Radiology Dictation Server (MVP1)

Offline Whisper transcription with a domain dictionary. One endpoint:
`POST /transcribe` — audio in, text out.

## Run locally

### Quick setup (recommended)

**Windows (PowerShell):**
```powershell
cd dictation-server
./setup.ps1
venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**macOS / Linux / Git Bash:**
```bash
cd dictation-server
bash setup.sh
source venv/bin/activate  # or venv/Scripts/activate on Git Bash
uvicorn main:app --reload --port 8000
```

The setup script checks Python, creates the venv, installs dependencies, and copies `.env.example` to `.env`. Run it once; after that just activate the venv and start uvicorn.

### Manual setup

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

## Deploying to Railway

The server ships with a `Dockerfile` and `railway.json` ready to deploy.

### One-time setup on Railway

1. **Create a new service** in your Railway project (separate from the React app service):
   - Click `+ New` → `GitHub Repo` → select `NickWojtaszek/personal_dashboard`
   - In the service **Settings** → **Root Directory**: set to `dictation-server`
   - Railway auto-detects the Dockerfile and deploys

2. **Set environment variables** in the new service:

   ```
   WHISPER_MODEL=tiny                # Railway free tier has 512MB RAM — use "tiny"; Pro can handle "base" or "small"
   WHISPER_DEVICE=cpu
   WHISPER_COMPUTE_TYPE=int8
   CORS_ORIGINS=https://personaldashboard-production-a145.up.railway.app
   ```

   Comma-separate multiple origins if you run both localhost and production:
   `CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://personaldashboard-production-a145.up.railway.app`

3. **Generate a public URL** for the service (Settings → Networking → Generate Domain). It'll look like `https://dictation-server-production-xxxx.up.railway.app`.

4. **Point the React app at it**:
   - Open the dashboard, go to the dictation editor
   - Click the gear icon next to the `[Browser | Server]` toggle
   - Replace `http://localhost:8000` with your new Railway URL (no trailing slash)
   - Save

### Cost / performance notes

- **Free tier (512 MB RAM, shared CPU):** Only fits `tiny` model. Accuracy is noticeably lower than `base`, but transcription is ~2× real-time. Cold starts take 30–60 s while Whisper downloads the model.
- **Pro tier ($5+/mo, 8 GB RAM, 8 vCPU):** Comfortable fit for `base` or `small`. `medium` is borderline; `large-v3` needs a GPU host (Railway doesn't offer one — use Fly.io, RunPod, or Modal for that).
- **Model downloads on every cold start** unless you attach a persistent Railway volume to `/root/.cache/huggingface`. At $0.25/GB/month, a 1 GB volume ($0.25/mo) saves you 30 s per cold start. Worth it if Railway sleeps your service.

### Health check behaviour

Railway will poll `/health` with a 120 s timeout. The first deployment request will take ~60 s while the model downloads — well within the window. If a deploy fails health checks, check the logs for `Loading Whisper model...` and look for OOM or download errors.

---

## What this server does NOT do

By design — these are handled client-side or deferred:

- LLM polish → use the existing `AIReportRefinementModal` in the React app
- Streaming (WebSocket) → MVP1 is segment-mode (HTTP) only
- Training data collection → deferred until consent/governance is in place
- Metrics dashboard, fine-tuning, clinical analytics → not in scope
