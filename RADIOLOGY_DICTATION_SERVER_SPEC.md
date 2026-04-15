# Radiology Dictation — Server-Side Transcription Integration

## Project overview

Add server-side speech-to-text to an existing radiology dictation app. The app currently uses browser Web Speech API (Path C). We are adding two new transcription paths that use a Python backend running faster-whisper:

- **Path A — Live stream**: WebSocket, real-time words appearing as the radiologist speaks, ~1s delay, VAD-triggered auto-polish
- **Path B — Segment mode**: Record a chunk, POST it, get back polished text in 2-3s
- **Path C — Browser native** (EXISTING, no changes): Web Speech API, zero server dependency, fallback/offline mode

All three paths feed into the **same existing editor** (`EditorPanel.tsx`) via the same callback interface. The existing AI polish, template system, radiology codes, storage, and i18n are untouched.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  BROWSER (React)                                     │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Path A       │  │ Path B       │  │ Path C     │ │
│  │ useStreamTx  │  │ useSegmentTx │  │ useSpeechRx│ │
│  │ (WebSocket)  │  │ (POST blob)  │  │ (Web API)  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                │         │
│         └────────┬────────┘                │         │
│                  ▼                         ▼         │
│         onTranscriptFinalized(text, source)          │
│                         │                            │
│                         ▼                            │
│              EditorPanel.tsx (EXISTING)               │
│              AIReportRefinementModal (EXISTING)       │
│              TemplateProvider (EXISTING)              │
└─────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌──────────────────┐    ┌───────────────────┐
│ FastAPI Backend   │    │ Supabase (EXISTS) │
│ (NEW - Python)    │    │ storage, auth     │
│                   │    └───────────────────┘
│ /transcribe (POST)│
│ /stream (WS)      │
│ faster-whisper     │
│ silero-vad         │
│ domain dictionary  │
│ optional LLM polish│
└───────────────────┘
```

---

## Part 1 — Python backend (NEW)

### Location

Create as a separate project directory: `dictation-server/`

This is a standalone FastAPI service. It does NOT live inside the React app. It will be deployed independently (GPU VPS, Railway, Fly.io, or local).

### File structure

```
dictation-server/
├── main.py                    # FastAPI app, CORS, lifespan
├── config.py                  # Settings via pydantic-settings
├── requirements.txt
├── Dockerfile
│
├── transcription/
│   ├── __init__.py
│   ├── engine.py              # WhisperEngine class (singleton)
│   ├── streaming.py           # WebSocket handler for Path A
│   └── segment.py             # POST handler for Path B
│
├── processing/
│   ├── __init__.py
│   ├── vad.py                 # Silero VAD wrapper
│   ├── domain_correction.py   # Radiology term fuzzy matcher
│   └── llm_polish.py          # Optional server-side LLM cleanup
│
├── data/
│   ├── radiology_terms_en.json
│   ├── radiology_terms_pl.json
│   └── radiology_terms_de.json
│
└── tests/
    ├── test_transcription.py
    ├── test_domain_correction.py
    └── test_audio/             # sample .webm/.wav files for testing
        └── chest_xray_sample.wav
```

### Dependencies (requirements.txt)

```
fastapi>=0.110
uvicorn[standard]>=0.27
websockets>=12.0
python-multipart>=0.0.6
faster-whisper>=1.0.0
silero-vad>=5.1
numpy>=1.24
pydantic-settings>=2.0
anthropic>=0.40           # for optional server-side LLM polish
httpx>=0.27               # for calling external LLM APIs
rapidfuzz>=3.5            # fuzzy string matching for domain terms
python-dotenv>=1.0
```

### config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Whisper
    whisper_model: str = "base"          # tiny|base|small|medium|large-v3
    whisper_device: str = "auto"         # auto|cpu|cuda
    whisper_compute_type: str = "int8"   # int8|float16|float32
    whisper_beam_size: int = 5

    # VAD
    vad_threshold: float = 0.5
    vad_min_silence_ms: int = 1500       # pause duration to trigger segment end

    # Server
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    max_audio_size_mb: int = 25

    # LLM polish (optional, can be disabled)
    llm_polish_enabled: bool = True
    llm_provider: str = "anthropic"      # anthropic|openai|gemini
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Language
    default_language: str = "en"         # en|pl|de — matches your LanguageContext

    class Config:
        env_file = ".env"
```

### main.py — Core endpoints

```python
from fastapi import FastAPI, WebSocket, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load whisper model ONCE at startup (takes 5-15s)
    engine = WhisperEngine(settings)
    app.state.engine = engine
    yield
    # Cleanup

app = FastAPI(lifespan=lifespan)

# CORS for your React app
app.add_middleware(CORSMiddleware, ...)
```

#### Endpoint 1: POST /transcribe (Path B — segment mode)

```
POST /transcribe
Content-Type: multipart/form-data

Fields:
  audio: File            # WebM/Opus or WAV blob from browser
  language: str          # "en" | "pl" | "de"
  polish: bool = true    # whether to run domain correction + LLM
  template_type: str?    # optional — "chest_xray", "mri_brain", etc.
                         # helps LLM structure the output

Response 200:
{
  "raw_text": "There is a 2 centimeter nodule in the right upper lobe...",
  "corrected_text": "There is a 2 cm nodule in the right upper lobe...",
  "polished_text": "FINDINGS:\nRight upper lobe: 2 cm pulmonary nodule...",
  "confidence": 0.94,
  "language_detected": "en",
  "processing_ms": {
    "transcription": 340,
    "domain_correction": 12,
    "llm_polish": 890
  }
}
```

Implementation notes:
- Accept WebM (Opus) directly — faster-whisper handles it
- If audio > 30s, split into chunks internally for better accuracy
- Return all three text versions so the client can choose what to display
- The `template_type` field feeds into the LLM prompt to structure output correctly

#### Endpoint 2: WebSocket /stream (Path A — live stream)

```
WS /stream?language=en

Client sends:
  Binary frames — raw audio chunks (1-2s of WebM/Opus each)
  JSON frames — control messages:
    {"type": "start", "language": "en", "template_type": "chest_xray"}
    {"type": "stop"}
    {"type": "config", "vad_threshold": 0.6}

Server sends:
  JSON frames:
    {"type": "partial", "text": "there is a two centi"}           # interim
    {"type": "final", "text": "There is a 2 cm nodule...",        # segment done
     "segment_id": "seg_001"}
    {"type": "polished", "segment_id": "seg_001",                 # LLM result
     "text": "FINDINGS: 2 cm pulmonary nodule in the RUL..."}
    {"type": "error", "message": "..."}
    {"type": "status", "vad": "speech"|"silence", "buffer_ms": 3400}
```

Implementation notes:
- Audio chunks arrive every 1-2s via binary WebSocket frames
- Each chunk is fed to faster-whisper for partial/interim results
- Silero VAD runs in parallel — when silence > vad_min_silence_ms, the accumulated audio buffer is processed as a complete segment
- The `final` message contains the complete segment transcription
- Asynchronously, the segment is sent to the LLM for polish, and a `polished` message follows 1-2s later
- The client shows `partial` text live, replaces with `final`, then optionally replaces with `polished`

#### Endpoint 3: GET /health

```
GET /health

Response 200:
{
  "status": "ok",
  "model": "base",
  "device": "cuda",
  "gpu_memory_used_mb": 412,
  "languages": ["en", "pl", "de"]
}
```

The React app calls this on mount to determine if the server is available and which modes to enable.

### transcription/engine.py — WhisperEngine

```python
class WhisperEngine:
    """
    Singleton wrapper around faster-whisper.
    Loaded once at app startup, reused across requests.
    """

    def __init__(self, settings: Settings):
        from faster_whisper import WhisperModel
        self.model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )

    def transcribe_segment(self, audio_bytes: bytes, language: str) -> TranscriptionResult:
        """
        Transcribe a complete audio segment.
        Used by Path B (segment mode).
        Returns full text + word-level timestamps + confidence.
        """
        ...

    def transcribe_chunk(self, audio_bytes: bytes, language: str) -> PartialResult:
        """
        Transcribe a short audio chunk for streaming.
        Used by Path A (live stream).
        Returns partial text suitable for live display.
        """
        ...
```

### processing/domain_correction.py

```python
class DomainCorrector:
    """
    Post-processes Whisper output to fix radiology-specific terms.
    Uses rapidfuzz for fuzzy matching against a medical dictionary.

    Examples of corrections:
      "hippo campus"     → "hippocampus"
      "car sin oma"      → "carcinoma"
      "two centimeter"   → "2 cm"
      "millie meters"    → "millimeters"
      "hyper intense"    → "hyperintense"
      "t two weighted"   → "T2-weighted"
      "dee eye com"      → "DICOM"

    The dictionary is loaded from data/radiology_terms_{lang}.json
    and should be extended over time as corrections are identified.
    """

    def __init__(self, language: str = "en"):
        self.terms = self._load_terms(language)

    def correct(self, text: str) -> str:
        """Apply all corrections, return cleaned text."""
        ...

    def add_correction(self, wrong: str, right: str):
        """Runtime addition — for user-submitted corrections."""
        ...
```

Dictionary JSON format:
```json
{
  "terms": {
    "hippocampus": ["hippo campus", "hipocampus", "hypo campus"],
    "carcinoma": ["car sin oma", "carcenoma", "karcinoma"],
    "T2-weighted": ["t two weighted", "t2 weighted", "tee two weighted"],
    "hyperintense": ["hyper intense", "hyper intents", "hyperintents"]
  },
  "abbreviations": {
    "centimeter": "cm",
    "millimeter": "mm",
    "right upper lobe": "RUL",
    "left lower lobe": "LLL"
  },
  "number_patterns": {
    "two centimeter": "2 cm",
    "three millimeter": "3 mm",
    "five by four": "5 × 4"
  }
}
```

### processing/llm_polish.py

```python
class LLMPolisher:
    """
    Sends domain-corrected text to an LLM for structural formatting.

    The LLM does NOT change medical facts. It:
    1. Structures text into sections (FINDINGS, IMPRESSION, TECHNIQUE, COMPARISON)
    2. Fixes grammar and punctuation
    3. Expands remaining abbreviations contextually
    4. Standardises formatting (measurements, anatomy terms)
    5. Optionally flags missing report elements

    System prompt is customised per template_type and language.
    """

    async def polish(
        self,
        text: str,
        language: str = "en",
        template_type: str | None = None,
        style_examples: list[str] | None = None,  # radiologist's past reports for style matching
    ) -> PolishResult:
        ...
```

Key system prompt requirements for the LLM:
- NEVER invent findings or add medical information not in the original dictation
- NEVER remove or change medical facts, measurements, or laterality
- Structure into standard radiology report sections
- Preserve the radiologist's voice and style
- Flag (don't fix) potential errors like laterality mismatches
- Respect language — if dictated in Polish, output in Polish

### processing/vad.py

```python
class VADProcessor:
    """
    Silero VAD wrapper for detecting speech/silence boundaries.
    Used by Path A (streaming) to know when a segment is complete.
    """

    def __init__(self, threshold: float = 0.5, min_silence_ms: int = 1500):
        self.model = self._load_silero()
        self.threshold = threshold
        self.min_silence_ms = min_silence_ms

    def process_chunk(self, audio_chunk: np.ndarray) -> VADEvent:
        """
        Returns: VADEvent with:
          - is_speech: bool
          - silence_duration_ms: int (if not speech, how long silence has lasted)
          - should_finalize: bool (silence > min_silence_ms)
        """
        ...
```

---

## Part 2 — React client changes (MODIFICATIONS TO EXISTING APP)

### New files to create

```
src/radiology/speaksync/
├── hooks/
│   ├── useServerTranscription.ts      # NEW — unified hook for Path A + B
│   └── useTranscriptionMode.ts        # NEW — mode selector logic
├── services/
│   └── transcriptionService.ts        # NEW — HTTP + WebSocket client
├── components/
│   ├── TranscriptionModeSelector.tsx   # NEW — UI toggle A/B/C
│   └── ServerStatusIndicator.tsx       # NEW — shows server health
└── types.ts                           # MODIFY — add new types
```

### hooks/useServerTranscription.ts — Core new hook

This hook MUST match the interface that `EditorPanel.tsx` already uses from `useSpeechRecognition.ts`. The editor calls the same callbacks regardless of which transcription path is active.

```typescript
interface UseServerTranscriptionOptions {
  language: string;               // "en" | "pl" | "de"
  mode: "stream" | "segment";     // Path A or Path B
  serverUrl: string;              // from settings
  templateType?: string;          // optional, for LLM context
  polish?: boolean;               // default true

  // These callbacks match the existing useSpeechRecognition interface:
  onInterimResult: (text: string) => void;
  onTranscriptFinalized: (text: string, source: TextSource) => void;
  onError: (error: Error) => void;
}

interface UseServerTranscriptionReturn {
  isListening: boolean;
  isConnected: boolean;           // server WebSocket/health status
  isProcessing: boolean;          // waiting for server response
  startListening: () => void;
  stopListening: () => void;
  serverLatency: number;          // ms, for UI display
}

export function useServerTranscription(options: UseServerTranscriptionOptions): UseServerTranscriptionReturn {
  // SEGMENT MODE (Path B):
  // 1. Start MediaRecorder (WebM/Opus)
  // 2. On stop (manual or VAD silence detected client-side):
  //    - Collect blob
  //    - POST to /transcribe
  //    - Call onTranscriptFinalized with polished_text
  //    - source = "server" (new TextSource value)
  //
  // STREAM MODE (Path A):
  // 1. Open WebSocket to /stream
  // 2. Start MediaRecorder with timeslice (1000ms chunks)
  // 3. On each chunk: send as binary WebSocket frame
  // 4. On "partial" message: call onInterimResult
  // 5. On "final" message: call onTranscriptFinalized with source = "server"
  // 6. On "polished" message: emit event to replace the segment text in editor
  //    (new callback needed — onSegmentPolished)
  //
  // AUDIO CAPTURE:
  // Use the same getUserMedia / remoteAudioStream logic that
  // useSpeechRecognition already uses. Share the MediaStream if possible.
}
```

### hooks/useTranscriptionMode.ts

```typescript
type TranscriptionMode = "browser" | "segment" | "stream";

interface UseTranscriptionModeReturn {
  mode: TranscriptionMode;
  setMode: (mode: TranscriptionMode) => void;
  serverAvailable: boolean;        // based on /health check
  serverInfo: ServerHealth | null;  // model, device, etc.
}

export function useTranscriptionMode(): UseTranscriptionModeReturn {
  // On mount: call GET /health on the configured server URL
  // If server unreachable: serverAvailable = false, force mode = "browser"
  // If server available: default to user's saved preference
  // Persist mode choice to settings (useStorage)
}
```

### New TextSource value

In `types.ts`, the existing TextSource type likely has values like `"voice"`, `"pasted"`, `"dragged"`, `"template"`. Add:

```typescript
type TextSource = "voice" | "pasted" | "dragged" | "template" | "server";
```

In `src/index.css`, add the corresponding source color:

```css
.text-server {
  color: var(--server-color, #a78bfa);   /* purple-ish — distinct from voice green */
}
```

Add `--server-color` to `SettingsContext.colorSettings` so the user can customize it like the other source colors.

### Modifications to existing files

#### EditorPanel.tsx

Minimal changes:
1. Accept the new `"server"` text source for coloring
2. Add optional `onSegmentPolished` handler that replaces a segment's text in-place (for Path A's async polish). Implementation: each finalized segment gets a `data-segment-id` attribute on its wrapper span. When the polished version arrives, find the span by ID and replace innerHTML.

#### SpeakSyncContent.tsx or equivalent view router

Add the `TranscriptionModeSelector` component to the editor toolbar area. This is a simple 3-way toggle: Browser | Segment | Stream. Disabled options shown when server unavailable.

#### SettingsProvider / SettingsContext

Add to settings:
```typescript
interface TranscriptionSettings {
  serverUrl: string;           // default "http://localhost:8000"
  defaultMode: TranscriptionMode;
  autoPolish: boolean;         // auto-run LLM on segments (vs manual modal)
  showLatency: boolean;        // show ms indicator in toolbar
  serverColor: string;         // source color for server-transcribed text
}
```

These get persisted via the existing `useStorage()` hook to localStorage + Supabase.

#### AIReportRefinementModal.tsx

No structural changes. BUT: add an option to skip the modal entirely for server-transcribed text that already went through LLM polish on the server side. Check a flag like `autoPolished: boolean` on the report metadata. If the text was already polished server-side, the "AI Enhance" button could show "Re-enhance" or skip the processing step and go straight to review.

### components/TranscriptionModeSelector.tsx

```
┌─────────────────────────────────────────┐
│  🌐 Browser  │  📡 Segment  │  🔴 Live  │
│   (offline)  │   (accurate)  │ (real-time)│
└─────────────────────────────────────────┘
       ▲              ▲              ▲
    Path C          Path B         Path A
   (existing)     (POST/resp)    (WebSocket)
```

- Disabled states: if server unavailable, Segment and Live are grayed out with tooltip "Server offline — using browser mode"
- Active state: highlighted with accent color
- Below the toggle: small latency indicator when using server modes ("~340ms")
- Persists choice to settings

### components/ServerStatusIndicator.tsx

Small dot indicator in the toolbar:
- 🟢 Connected (server healthy, GPU available)
- 🟡 Connected, no GPU (CPU mode — slower)
- 🔴 Disconnected (fallback to browser)
- Clicking opens a tooltip with: model name, device, latency, last health check

---

## Part 3 — Integration details

### Audio format pipeline

Browser MediaRecorder → WebM/Opus (default in Chrome) → send to server → faster-whisper accepts WebM directly (no conversion needed).

If Safari: MediaRecorder may output MP4/AAC. The server should handle both. faster-whisper handles common formats via ffmpeg internally.

### Language synchronization

The existing `LanguageContext` provides `language` and `speechCode` (e.g., `"pl-PL"`). Pass the base language code (`"pl"`) to the server endpoints. The server uses this for:
- Whisper's `language` parameter (improves accuracy vs auto-detect)
- Selecting the correct domain dictionary (`radiology_terms_pl.json`)
- LLM polish prompt language

### CORS configuration

The FastAPI server must allow the origin of your React dev server AND production domain:
```python
origins = [
    "http://localhost:5173",      # Vite dev
    "http://localhost:3000",      # CRA dev
    "https://yourdomain.com",    # Production
]
```

### Authentication

The server should validate requests against the same Supabase auth. Pass the Supabase JWT in the Authorization header. The server verifies it against your Supabase project:
```
Authorization: Bearer <supabase_jwt>
```

For development/prototyping: skip auth, add it before production.

### Error handling and fallback

Critical behavior: if the server connection drops mid-dictation, the app MUST fall back to Path C (browser) automatically. The user should see a brief notification ("Server disconnected — switched to browser mode") and continue dictating without interruption.

Implementation:
- `useServerTranscription` monitors WebSocket `onclose` / fetch failures
- On failure: emit an event that `useTranscriptionMode` catches
- `useTranscriptionMode` switches to "browser" mode and activates `useSpeechRecognition`
- When server comes back (periodic health check every 30s), show option to switch back

---

## Part 4 — Data: radiology term dictionaries

### Structure per language

Create initial dictionaries for en, pl, de. These grow over time as radiologists correct terms.

Priority terms to include (English example — ~200 terms to start):

**Anatomy**: hippocampus, cerebellum, cerebrum, ventricle, parenchyma, mediastinum, hilum, pleura, pericardium, peritoneum, retroperitoneum, mesentery, aorta, subclavian, brachiocephalic, vertebral body, spinous process, foramen, intervertebral disc, spinal canal, thecal sac, cauda equina

**Pathology**: carcinoma, adenocarcinoma, metastasis, lymphadenopathy, consolidation, atelectasis, pneumothorax, hemothorax, effusion, edema, hemorrhage, infarction, stenosis, aneurysm, dissection, thrombosis, embolism, calcification, ossification, sclerosis, lucency, lytic, blastic

**Modality terms**: T1-weighted, T2-weighted, FLAIR, DWI, ADC, post-contrast, pre-contrast, coronal, sagittal, axial, reformatted, multiplanar, maximum intensity projection (MIP), hounsfield units, window/level, DICOM

**Measurements**: standardize "two centimeter" → "2 cm", "three by four" → "3 × 4", "point five" → "0.5"

**Polish-specific** (for pl dictionary): all NFZ codes from your existing `radiologyCodes.ts`, Polish anatomical terms, Polish pathology terms

### User correction feedback loop

When a radiologist manually corrects a server-transcribed word in the editor, log the before/after pair. Periodically batch these into dictionary updates:

```typescript
// Client-side: detect corrections to server-transcribed text
interface TranscriptionCorrection {
  original: string;      // what the server produced
  corrected: string;     // what the user changed it to
  language: string;
  timestamp: number;
  context: string;       // surrounding 20 words for disambiguation
}
```

Store corrections in Supabase. A future admin tool can review and promote corrections into the official dictionary.

---

## Part 5 — Build order (phases)

### Phase 1: Standalone server (days 1-2)

Build `dictation-server/` as a completely independent Python project. Test with curl and audio files.

1. Set up FastAPI with config, health endpoint
2. Implement `WhisperEngine` — load model, transcribe a WAV file
3. Implement `POST /transcribe` — accept audio upload, return text
4. Implement `DomainCorrector` — load English dictionary, basic fuzzy matching
5. Implement `LLMPolisher` — call Claude API with radiology prompt
6. Test end-to-end: `curl -F "audio=@test.wav" http://localhost:8000/transcribe`
7. Write basic tests with sample audio files

**Done when**: you can POST a radiology dictation audio file and get back a properly structured report.

### Phase 2: Path B integration (days 3-4)

Connect segment mode to the existing React app.

1. Create `transcriptionService.ts` — HTTP client for `/transcribe` and `/health`
2. Create `useServerTranscription.ts` — segment mode only first
3. Create `useTranscriptionMode.ts` — health check + mode switching
4. Create `TranscriptionModeSelector.tsx` — UI toggle
5. Add `"server"` TextSource + CSS class to editor
6. Wire into `EditorPanel` — verify text appears with correct source coloring
7. Add `TranscriptionSettings` to `SettingsProvider`
8. Test: switch to Segment mode, dictate, see polished text in editor

**Done when**: you can toggle between Browser and Segment mode, dictate into both, and see correctly colored text in the editor.

### Phase 3: Path A streaming (days 5-7)

Add live streaming mode.

1. Implement `WebSocket /stream` endpoint on server
2. Implement `VADProcessor` — silence detection for segment boundaries
3. Add stream mode to `useServerTranscription.ts` — WebSocket + chunked MediaRecorder
4. Handle partial → final → polished message sequence in the hook
5. Implement in-place segment replacement in `EditorPanel` (data-segment-id approach)
6. Create `ServerStatusIndicator.tsx`
7. Implement automatic fallback: server disconnect → browser mode
8. Test: stream mode, speak continuously, see words appear live, see polish happen behind

**Done when**: live streaming works with real-time text display and background polishing.

### Phase 4: Polish and edge cases (days 8-10)

1. Add Polish and German dictionaries
2. Test all three languages across all three modes
3. Implement correction feedback loop (log user edits to server-transcribed text)
4. Handle Safari audio format (MP4/AAC)
5. Add retry logic for transient server errors
6. Add latency display in UI
7. Performance test: multiple rapid segments, long continuous dictation (10+ min)
8. Verify auto-polish skip in `AIReportRefinementModal` for server-polished text

---

## Part 6 — Environment setup

### Server development

```bash
cd dictation-server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
echo "WHISPER_MODEL=base" >> .env
echo "WHISPER_DEVICE=cpu" >> .env
echo "ANTHROPIC_API_KEY=sk-..." >> .env

# Run
uvicorn main:app --reload --port 8000
```

For development: use `whisper_model=tiny` or `base` on CPU. Good enough for testing, transcribes in 2-5s per segment.

For production: use `whisper_model=small` or `medium` on a CUDA GPU. Transcribes in 200-500ms.

### Client development

No new dependencies needed in the React app — MediaRecorder API and WebSocket are native browser APIs. Just add the new files and modify the existing ones as specified above.

Add to the React app's `.env`:
```
VITE_TRANSCRIPTION_SERVER_URL=http://localhost:8000
```

---

## Part 7 — LLM polish prompt (for server-side)

```
SYSTEM PROMPT FOR RADIOLOGY REPORT POLISH:

You are a radiology report formatting assistant. You receive raw dictated text
from a radiologist and structure it into a properly formatted radiology report.

CRITICAL RULES:
1. NEVER add medical findings that are not in the original dictation
2. NEVER change laterality (left/right), measurements, or medical facts
3. NEVER remove information from the original dictation
4. If you detect a possible error (e.g., "right" when context suggests "left"),
   FLAG it with [VERIFY: ...] — do not silently correct it

STRUCTURE the output into standard sections when present in the dictation:
- TECHNIQUE (if mentioned)
- COMPARISON (if mentioned)
- FINDINGS (always)
- IMPRESSION (always — summarize key findings if not explicitly dictated)

FORMATTING:
- Use standard radiology abbreviations (cm, mm, RUL, LLL, etc.)
- Capitalize anatomical structures consistently
- Use numbered lists for multiple findings in IMPRESSION
- Preserve the radiologist's personal style and phrasing where possible

LANGUAGE: Output in the same language as the input. If Polish, use Polish
medical terminology. If German, use German medical terminology.

INPUT: {raw_dictated_text}
TEMPLATE TYPE: {template_type or "general"}
```

---

## Key decisions and constraints

1. **The server is a separate project** — not embedded in the React app. This is intentional: it needs Python, may need a GPU, and should be deployable independently.

2. **The existing editor is NOT rewritten** — new hooks feed into the same callback interface. The editor just sees text arriving.

3. **Three modes coexist** — the user toggles freely. Automatic fallback to browser mode on server failure.

4. **LLM polish can happen server-side OR client-side** — for Path B/A the server does it by default. The existing client-side `AIReportRefinementModal` remains available as a manual "re-enhance" option regardless of mode.

5. **Domain dictionaries start small and grow** — initial 200 terms per language, augmented by user corrections over time.

6. **Auth is deferred** — build without auth first, add Supabase JWT verification before production.

7. **The server handles multiple languages** — matching the existing app's en/pl/de support.

8. **Training data collection is passive by default** — audio + correction pairs are saved automatically. No patient data exists in the audio stream (reports are anonymized dictation only, patient identity is in RIS). Only radiologist voice consent is needed.

---

## Part 8 — Data collection pipeline (training module)

### Why this exists

Every dictation that flows through the server produces a labeled training pair: audio in, corrected text out. Since the audio stream contains NO patient data (no names, no PESEL, no DOB — all of that lives in RIS and gets attached later), the data is inherently anonymized. This means we can store everything for future model fine-tuning with minimal legal overhead.

The only consent needed is from the radiologist for their voice biometric data — a simple toggle in settings.

### What gets stored per dictation

```python
class TrainingRecord:
    """One dictation session = one training record."""

    # Identity
    record_id: str              # UUID, no link to patient
    session_id: str             # groups segments from one report
    radiologist_id: str         # hashed user ID (for per-user metrics)
    timestamp: datetime

    # Audio
    audio_blob: bytes           # original WebM/Opus from browser
    audio_duration_ms: int
    audio_sample_rate: int

    # Transcription chain (every stage preserved)
    whisper_raw: str            # what Whisper produced
    whisper_model_version: str  # e.g. "base", "fine-tune-v2"
    whisper_confidence: float
    whisper_language: str

    domain_corrected: str       # after fuzzy dictionary pass
    corrections_applied: list[CorrectionPair]  # [{"from": "hipo kamp", "to": "hipokamp"}]

    llm_polished: str           # after LLM structuring
    llm_provider: str           # which LLM was used
    llm_prompt_version: str     # track prompt changes

    # Ground truth (THE GOLD LABEL)
    final_approved: str | None  # what the radiologist actually signed
    user_edits: list[EditEvent] # every manual correction in the editor

    # Metadata
    study_type: str | None      # "chest_xray", "mri_brain", etc.
    language: str               # "pl", "en", "de"
    transcription_mode: str     # "stream", "segment", "browser"
    microphone_id: str | None   # for tracking hardware differences
```

```python
class EditEvent:
    """One user correction in the editor."""
    timestamp: datetime
    original_text: str          # the span they selected/changed
    corrected_text: str         # what they typed instead
    source: str                 # "server" | "voice" | etc.
    position_in_report: int     # character offset
    context_before: str         # 30 chars before the edit
    context_after: str          # 30 chars after the edit
```

```python
class CorrectionPair:
    """One domain dictionary correction."""
    original: str
    corrected: str
    match_score: float          # rapidfuzz score
    dictionary_key: str         # which dictionary entry matched
```

### Server-side storage

#### New files in dictation-server/

```
dictation-server/
├── training/
│   ├── __init__.py
│   ├── collector.py           # TrainingCollector class
│   ├── storage.py             # Save to disk / Supabase storage
│   └── metrics.py             # Compute maturity metrics
```

#### training/collector.py

```python
class TrainingCollector:
    """
    Passive data collector. Hooks into the transcription pipeline
    and stores training records without affecting performance.

    All storage is async — never blocks the transcription response.
    """

    def __init__(self, settings: Settings):
        self.enabled = settings.training_collection_enabled
        self.storage_path = settings.training_data_path  # local dir
        self.supabase_bucket = settings.training_bucket   # cloud backup

    async def record_transcription(
        self,
        audio: bytes,
        whisper_result: TranscriptionResult,
        domain_result: str,
        llm_result: str | None,
        session_id: str,
        metadata: dict,
    ) -> str:
        """
        Called after every transcription. Returns record_id.
        Saves audio as .webm file, text stages as .json sidecar.
        """
        ...

    async def record_user_edit(
        self,
        session_id: str,
        edit: EditEvent,
    ):
        """
        Called from client when radiologist edits server-transcribed text.
        Updates the training record with ground truth corrections.
        """
        ...

    async def finalize_session(
        self,
        session_id: str,
        final_text: str,
    ):
        """
        Called when radiologist signs/approves the report.
        Sets final_approved — this is the gold label.
        """
        ...
```

#### New server endpoints for training data

```
POST /training/edit
  Body: { session_id, original_text, corrected_text, position, context }
  Called by client whenever user edits a .text-server span.

POST /training/finalize
  Body: { session_id, final_text }
  Called when report is signed/approved.

GET /training/stats
  Response: current maturity metrics (see Part 9)

GET /training/export?from=2026-01-01&to=2026-04-01&format=huggingface
  Exports training data in HuggingFace dataset format for fine-tuning.
  Returns a zip of audio files + metadata.json.
```

#### config.py additions

```python
class Settings(BaseSettings):
    # ... existing settings ...

    # Training data collection
    training_collection_enabled: bool = True
    training_data_path: str = "./training_data"
    training_bucket: str = "training-audio"     # Supabase storage bucket
    training_consent_required: bool = True       # block collection without consent
```

#### Storage structure on disk

```
training_data/
├── 2026-04/
│   ├── 2026-04-15/
│   │   ├── sess_abc123/
│   │   │   ├── segment_001.webm          # audio
│   │   │   ├── segment_001.json          # all text stages + metadata
│   │   │   ├── segment_002.webm
│   │   │   ├── segment_002.json
│   │   │   └── session_meta.json         # final approved text, edit log
│   │   ├── sess_def456/
│   │   │   └── ...
```

### Client-side changes for training data

#### EditorPanel.tsx modifications

When a user edits text inside a `.text-server` span, capture the edit and POST it:

```typescript
// Detect edits to server-transcribed text
function handleEditorInput(event: InputEvent) {
  const target = event.target as HTMLElement;
  const serverSpan = target.closest('.text-server');
  if (serverSpan && currentSessionId) {
    const editEvent: EditEvent = {
      timestamp: Date.now(),
      originalText: serverSpan.dataset.originalText || '',
      correctedText: serverSpan.textContent || '',
      source: 'server',
      position: getCaretOffset(),
      contextBefore: getContextBefore(30),
      contextAfter: getContextAfter(30),
    };
    transcriptionService.recordEdit(currentSessionId, editEvent);
  }
}
```

Each `.text-server` span should store its original text in a data attribute:
```html
<span class="text-server"
      data-segment-id="seg_001"
      data-original-text="there is a 2 cm hipokampus">
  there is a 2 cm hippocampus
</span>
```

#### Report submission hook

When the report is signed/submitted (existing flow via `ReportProvider`), call the finalize endpoint:

```typescript
// In the existing report submission flow
async function submitReport(report: Report) {
  // ... existing submission logic ...

  // Finalize training session
  if (currentSessionId && transcriptionMode !== 'browser') {
    await transcriptionService.finalizeSession(
      currentSessionId,
      report.finalText,
    );
  }
}
```

#### Settings UI addition

Add to the existing settings view:

```typescript
// Training data consent toggle
<SettingsToggle
  label="Allow voice data collection for model improvement"
  description="Your anonymized dictations (no patient data) will be stored
               to improve transcription accuracy over time.
               Only your voice biometric data is involved."
  value={settings.trainingConsent}
  onChange={(v) => updateSettings({ trainingConsent: v })}
/>
```

The server checks this flag via a header: `X-Training-Consent: true`. If missing or false, the `TrainingCollector` skips storage for that session.

---

## Part 9 — Maturity tracking (counters and dashboard)

### The metrics that matter

Track these automatically, compute daily, store in Supabase.

#### Metric 1: Correction rate (PRIMARY — this is the one that matters most)

```
corrections_per_report = user_edits_to_server_text / total_reports_today
```

What it tells you: how many times you had to fix something per report. This is the number you watch daily. Everything else is secondary.

Targets:
- Week 1-2:  8-15 corrections/report (normal, system is learning your vocabulary)
- Month 1:   4-8 corrections/report (dictionary is growing)
- Month 2-3: 2-4 corrections/report (first fine-tune deployed)
- Month 4+:  0-2 corrections/report (MATURE — system knows your voice)

#### Metric 2: Word Error Rate (WER) — medical terms only

```
medical_wer = edit_distance(whisper_medical_terms, approved_medical_terms) / total_medical_terms
```

Computed by extracting medical terms (anatomy, pathology, modality terms) from both the Whisper output and the final approved text, then calculating edit distance on just those terms. General words like "the", "is", "there" are excluded — we only care about domain accuracy.

Targets:
- Stock Whisper:    20-30% medical WER for Polish
- After dictionary: 10-15%
- After fine-tune:  3-8%
- Mature:           <3%

#### Metric 3: Dictionary hit rate

```
dictionary_hit_rate = terms_corrected_by_dictionary / total_medical_terms_in_output
```

Tells you how much the fuzzy dictionary is still doing. As the fine-tuned model improves, this number should DROP — meaning Whisper is getting the terms right without needing the dictionary as a safety net.

Targets:
- Week 1:     30-50% of medical terms need dictionary correction
- After fine-tune: 5-10%
- Mature:     <3% (dictionary is a safety net, not a crutch)

#### Metric 4: LLM polish delta

```
polish_delta = levenshtein_distance(domain_corrected_text, llm_polished_text) / len(domain_corrected_text)
```

How much the LLM has to change the text. High delta means the raw transcription needs heavy restructuring. Low delta means the radiologist is getting clean, well-structured text out of Whisper+dictionary alone, and the LLM is only doing light formatting.

Targets:
- Early:  40-60% delta (LLM doing heavy lifting)
- Mature: 5-15% delta (LLM just adds section headers and minor formatting)

#### Metric 5: Data volume counters

```
total_audio_hours: float            # cumulative hours of dictation stored
total_reports: int                  # total reports with training data
total_corrections: int              # total user edits recorded
total_unique_correction_terms: int  # unique medical terms corrected
model_version: str                  # currently deployed model checkpoint
days_since_last_finetune: int
```

### Server-side: training/metrics.py

```python
class MaturityMetrics:
    """
    Computes and stores maturity metrics.
    Called nightly via a background task, or on-demand via /training/stats.
    """

    async def compute_daily(self, date: str) -> DailyMetrics:
        """Pull all training records for the date, compute metrics."""
        ...

    async def compute_cumulative(self) -> CumulativeMetrics:
        """Lifetime stats across all data."""
        ...

    def assess_readiness(self, cumulative: CumulativeMetrics) -> ReadinessAssessment:
        """
        Returns a structured assessment:
        {
          "ready_for_finetune": bool,
          "reason": str,
          "audio_hours": 52.3,
          "recommendation": "You have enough data for a first fine-tune. See Part 10.",
          "next_checkpoint": "CHECKPOINT_2" | "CHECKPOINT_3" | etc.
        }
        """
        ...
```

### New endpoint

```
GET /training/stats

Response 200:
{
  "today": {
    "reports": 43,
    "corrections_per_report": 5.2,
    "medical_wer": 0.18,
    "dictionary_hit_rate": 0.34,
    "llm_polish_delta": 0.42,
    "audio_minutes": 94
  },
  "cumulative": {
    "total_audio_hours": 52.3,
    "total_reports": 1847,
    "total_corrections": 8420,
    "unique_correction_terms": 312,
    "model_version": "whisper-base-stock",
    "days_since_last_finetune": null,
    "collection_start_date": "2026-04-15"
  },
  "trend": {
    "corrections_per_report_7d_avg": 5.8,
    "corrections_per_report_30d_avg": 7.2,
    "trend_direction": "improving"
  },
  "readiness": {
    "ready_for_finetune": true,
    "current_checkpoint": "CHECKPOINT_1",
    "next_action": "You have 52 hours of audio. Ready for first fine-tune.",
    "recommendation": "Run fine-tune with whisper-large-v3 base, LoRA rank 32."
  }
}
```

### Client-side: maturity dashboard component

#### New file: components/TrainingDashboard.tsx

Add as a new tab in the existing `activeTab` system — alongside editor, planner, codes, reports, add "training" (or "model" or "accuracy").

```typescript
interface TrainingDashboardProps {
  stats: TrainingStats;       // from GET /training/stats
}

// Display:
// 1. Top banner: current checkpoint status with progress bar
//    "CHECKPOINT 1: Collecting data — 52/50 hours ✓ Ready for fine-tune"
//
// 2. Today's metrics: 4 cards showing today's correction rate, WER,
//    dictionary hits, LLM delta — each with a small sparkline trend
//
// 3. Correction rate chart: line chart over time (daily averages)
//    with checkpoint markers showing when fine-tunes were deployed
//    X-axis: dates, Y-axis: corrections per report
//    Vertical dashed lines at each model deployment
//
// 4. Most corrected terms: table of top 20 terms you keep fixing
//    with "Add to dictionary" button for each
//
// 5. Data volume: simple counters — hours, reports, corrections
//
// 6. Readiness assessment: next action card from the API
```

---

## Part 10 — Model fine-tuning pipeline (checkpoints and triggers)

### Checkpoint system

The system progresses through defined checkpoints. Each checkpoint has entry criteria, actions, and exit criteria.

```
CHECKPOINT_0: BASELINE
  Status: Stock Whisper model, no training data
  Entry:  System deployed, first dictation
  Action: Just use the system, collect data, grow dictionary manually
  Exit:   Move to CP1 when you have 10+ hours of audio
  Duration: ~1-2 weeks of daily use

CHECKPOINT_1: DICTIONARY TUNING
  Status: 10-50 hours of audio collected, dictionary growing
  Entry:  10 hours of audio, 500+ corrections logged
  Action: Review top 50 most-corrected terms weekly
          Add confirmed corrections to radiology_terms_{lang}.json
          Deploy updated dictionary (no model change, just restart server)
  Monitor: correction_rate should drop 20-30% from dictionary alone
  Exit:   Move to CP2 when you have 50+ hours of audio
  Duration: ~4-6 weeks of daily use

CHECKPOINT_2: FIRST FINE-TUNE
  Status: 50+ hours of audio, stable correction patterns
  Entry:  50 hours of audio AND correction_rate trend is flat
          (dictionary alone isn't improving things anymore)
  Action: Export training data via GET /training/export
          Run fine-tuning job (see procedure below)
          Deploy fine-tuned model
          KEEP the old model as fallback
  Monitor: correction_rate should drop 40-60% after deployment
  Exit:   Move to CP3 after 2 weeks of post-deploy data
  Duration: fine-tune takes 4-12 hours, deploy takes 30 min

CHECKPOINT_3: VALIDATION
  Status: Fine-tuned model deployed, collecting comparison data
  Entry:  2 weeks after CHECKPOINT_2 deployment
  Action: Compare metrics: before vs after fine-tune
          If correction_rate improved: stay on fine-tuned model
          If correction_rate WORSE: rollback to stock + dictionary
          Identify remaining problem terms for next cycle
  Monitor: medical_wer, dictionary_hit_rate (should be dropping)
  Exit:   Move to CP4 when you have 100+ hours total
  Duration: 2-4 weeks

CHECKPOINT_4: SECOND FINE-TUNE
  Status: 100+ hours, includes post-fine-tune corrections
  Entry:  100 hours of audio AND at least 4 weeks since CP2
  Action: Fine-tune again, this time starting from YOUR CP2 model
          (not stock Whisper — compound the improvements)
          Use LoRA rank 64 (higher capacity for more data)
  Monitor: correction_rate should approach 1-2 per report
  Exit:   Move to CP5 when correction_rate < 3 for 2 weeks straight
  Duration: same as CP2

CHECKPOINT_5: MATURE
  Status: Model is production-quality for your voice + vocabulary
  Entry:  correction_rate < 3 per report, sustained for 2 weeks
  Action: Reduce fine-tune frequency to every 3-6 months
          Dictionary updates become rare
          Focus shifts to edge cases and rare study types
          Consider: model is ready for other radiologists to test
  Monitor: watch for regression (new study types, new terms)
  Duration: ongoing
```

### Automated checkpoint notifications

The server's `/training/stats` endpoint returns the current checkpoint and next action. The client shows this as a persistent banner or card in the Training Dashboard:

```python
def assess_checkpoint(cumulative: CumulativeMetrics) -> CheckpointAssessment:
    hours = cumulative.total_audio_hours
    corrections_avg = cumulative.corrections_per_report_14d_avg
    days_since_finetune = cumulative.days_since_last_finetune

    if cumulative.model_version == "stock":
        if hours < 10:
            return CheckpointAssessment(
                checkpoint="CP0_BASELINE",
                progress_pct=hours / 10 * 100,
                message=f"Collecting baseline data: {hours:.1f}/10 hours",
                next_action="Keep dictating. Review corrected terms weekly.",
                color="blue",
            )
        elif hours < 50:
            return CheckpointAssessment(
                checkpoint="CP1_DICTIONARY",
                progress_pct=hours / 50 * 100,
                message=f"Dictionary tuning phase: {hours:.1f}/50 hours",
                next_action="Review your top corrected terms and add to dictionary.",
                color="teal",
            )
        else:
            return CheckpointAssessment(
                checkpoint="CP2_READY",
                progress_pct=100,
                message=f"Ready for first fine-tune! {hours:.1f} hours collected.",
                next_action="Export data and run fine-tuning job. See docs.",
                color="amber",
                urgent=True,
            )
    else:
        # Model is fine-tuned
        if days_since_finetune and days_since_finetune < 14:
            return CheckpointAssessment(
                checkpoint="CP3_VALIDATION",
                progress_pct=days_since_finetune / 14 * 100,
                message=f"Validating fine-tuned model: day {days_since_finetune}/14",
                next_action="Monitor correction rate vs pre-fine-tune baseline.",
                color="purple",
            )
        elif corrections_avg <= 3:
            return CheckpointAssessment(
                checkpoint="CP5_MATURE",
                progress_pct=100,
                message=f"System mature. {corrections_avg:.1f} corrections/report avg.",
                next_action="Maintenance mode. Fine-tune every 3-6 months.",
                color="green",
            )
        elif hours > 100:
            return CheckpointAssessment(
                checkpoint="CP4_SECOND_FINETUNE",
                progress_pct=100,
                message=f"Ready for second fine-tune. {hours:.1f} hours total.",
                next_action="Fine-tune from current model, LoRA rank 64.",
                color="amber",
                urgent=True,
            )
        else:
            # Between fine-tunes, collecting more data
            return CheckpointAssessment(
                checkpoint="CP3_COLLECTING",
                progress_pct=hours / 100 * 100,
                message=f"Collecting post-fine-tune data: {hours:.1f}/100 hours",
                next_action="Keep dictating. Next fine-tune at 100 hours.",
                color="teal",
            )
```

### Fine-tuning procedure (CHECKPOINT_2 and CP4)

This section is reference documentation — the actual fine-tuning happens outside the app, on a GPU machine or cloud instance.

#### Step 1: Export training data

```bash
# From your local machine
curl "http://your-server:8000/training/export?format=huggingface&from=2026-04-15" \
  -o training_export.zip

unzip training_export.zip -d ./finetune_data/
```

The export produces:
```
finetune_data/
├── metadata.json          # dataset card, stats
├── train/
│   ├── audio/             # .webm files
│   └── transcripts.json   # { "file": "audio/001.webm", "text": "final approved text" }
├── validation/            # 10% held out automatically
│   ├── audio/
│   └── transcripts.json
```

#### Step 2: Run fine-tuning

```python
# finetune.py — run on a GPU machine (A100 recommended, T4 minimum)
# Uses HuggingFace transformers + PEFT for LoRA

from transformers import WhisperForConditionalGeneration, WhisperProcessor
from peft import LoraConfig, get_peft_model
from datasets import load_dataset

# Load base model
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3")
processor = WhisperProcessor.from_pretrained("openai/whisper-large-v3")

# LoRA config (CP2: rank 32, CP4: rank 64)
lora_config = LoraConfig(
    r=32,                       # 64 for second fine-tune
    lora_alpha=64,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
)
model = get_peft_model(model, lora_config)

# Load your exported dataset
dataset = load_dataset("audiofolder", data_dir="./finetune_data")

# Training arguments
training_args = Seq2SeqTrainingArguments(
    output_dir="./whisper-radiology-pl-v1",
    per_device_train_batch_size=8,
    gradient_accumulation_steps=2,
    learning_rate=1e-4,
    num_train_epochs=3,           # 3-5 epochs for first fine-tune
    evaluation_strategy="steps",
    eval_steps=500,
    save_steps=500,
    logging_steps=100,
    fp16=True,                    # or bf16 on A100
    predict_with_generate=True,
    generation_max_length=225,
)

# Train
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
    data_collator=data_collator,
    tokenizer=processor.feature_extractor,
)
trainer.train()

# Save — produces a LoRA adapter, not a full model copy
model.save_pretrained("./whisper-radiology-pl-v1")

# To merge into a single model for faster-whisper (CTranslate2):
# 1. Merge LoRA: model.merge_and_unload()
# 2. Save merged: model.save_pretrained("./whisper-radiology-pl-v1-merged")
# 3. Convert to CTranslate2: ct2-opus-converter (see faster-whisper docs)
```

Expected training time:
- 50 hours of audio, LoRA rank 32, A100: ~4-6 hours
- 50 hours of audio, LoRA rank 32, T4: ~10-14 hours
- 100 hours of audio, LoRA rank 64, A100: ~8-12 hours

#### Step 3: Deploy fine-tuned model

```bash
# On your dictation server
# 1. Copy the converted CTranslate2 model to the server
scp -r whisper-radiology-pl-v1-ct2/ server:/models/

# 2. Update .env
WHISPER_MODEL=/models/whisper-radiology-pl-v1-ct2

# 3. Restart
sudo systemctl restart dictation-server
# or: docker-compose restart
```

#### Step 4: Record the deployment

```bash
# Tell the training system a new model was deployed
curl -X POST "http://localhost:8000/training/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "model_version": "whisper-radiology-pl-v1",
    "base_model": "whisper-large-v3",
    "training_hours": 52.3,
    "lora_rank": 32,
    "epochs": 3,
    "notes": "First fine-tune, 1847 reports, Polish radiology"
  }'
```

New endpoint:
```
POST /training/deploy
  Body: { model_version, base_model, training_hours, lora_rank, epochs, notes }
  Records a deployment event. Used for:
    - Marking checkpoint transitions
    - Drawing vertical lines on the correction rate chart
    - Comparing pre/post metrics
```

### Model versioning

Keep every model checkpoint. Never delete the previous version.

```
/models/
├── whisper-base-stock/          # original, always available as fallback
├── whisper-radiology-pl-v1/     # first fine-tune (CP2)
├── whisper-radiology-pl-v2/     # second fine-tune (CP4)
└── active -> whisper-radiology-pl-v1/  # symlink to current
```

The config points to `/models/active`. Rollback = change the symlink, restart.

---

## Part 11 — Updated build phases (revised with training module)

### Phase 1: Standalone server (days 1-2)
No changes from original spec.

### Phase 2: Path B integration (days 3-4)
No changes from original spec.

### Phase 3: Path A streaming (days 5-7)
No changes from original spec.

### Phase 4: Polish and edge cases (days 8-10)
No changes from original spec.

### Phase 5: Training data collection (days 11-13)

1. Create `training/collector.py` — store audio + text pairs on each transcription
2. Create `training/storage.py` — disk storage with date-based directory structure
3. Add `POST /training/edit` endpoint — receive correction events from client
4. Add `POST /training/finalize` endpoint — receive final approved text
5. Modify `EditorPanel.tsx` — detect edits to `.text-server` spans, POST corrections
6. Modify report submission flow — call finalize on sign-off
7. Add training consent toggle to Settings UI
8. Add `data-original-text` attribute to server-transcribed spans
9. Test: dictate a report, make corrections, sign it, verify all data saved

### Phase 6: Maturity metrics and dashboard (days 14-16)

1. Create `training/metrics.py` — compute daily and cumulative metrics
2. Add `GET /training/stats` endpoint
3. Add `GET /training/export` endpoint — HuggingFace dataset format export
4. Add `POST /training/deploy` endpoint — record model deployments
5. Implement checkpoint assessment logic
6. Create `TrainingDashboard.tsx` — new tab in the app
7. Add correction rate chart (use recharts, already in your dependencies)
8. Add checkpoint status banner
9. Add "most corrected terms" table with "add to dictionary" buttons
10. Test: verify metrics compute correctly, chart shows trend

### Phase 7: First fine-tune (when CHECKPOINT_2 is reached, ~week 8-10)

This is NOT a code phase — it's an operational milestone.

1. Export training data via `/training/export`
2. Rent GPU instance (Lambda Labs, Vast.ai, or Google Colab Pro)
3. Run `finetune.py` script
4. Convert to CTranslate2 format
5. Deploy to server, update config
6. Record deployment via `POST /training/deploy`
7. Monitor metrics for 2 weeks (CHECKPOINT_3)
8. If improved: celebrate. If not: rollback, investigate.

---

## Updated key decisions and constraints

All original decisions (1-7) remain. Adding:

8. **Training data collection is passive by default** — audio + correction pairs are saved automatically. No patient data exists in the audio stream. Only radiologist voice consent is needed.

9. **Checkpoints are advisory, not automatic** — the system tells you when it's ready for a fine-tune. You decide when to actually do it. No model changes happen without explicit human action.

10. **Model versioning is strict** — every checkpoint is kept. Rollback is always one symlink change away. Never delete a working model.

11. **The correction rate chart is the project's heartbeat** — if you look at one metric, look at this. Everything else is supporting detail.

12. **All three paths collect training data** — Path A/B natively (audio already on server), Path C via background upload. See Part 12.

---

## Part 12 — Path C data collection, weaknesses analysis, and mitigations

### 12.1 — Path C (browser mode) data collection

Path C audio never touches the server — the Web Speech API processes locally. To collect training data from Path C, run a parallel `MediaRecorder` alongside the speech recognition engine.

#### Client-side: modify useSpeechRecognition.ts

```typescript
// ADD to the existing useSpeechRecognition hook:

interface BrowserTrainingConfig {
  enabled: boolean;              // from settings.trainingConsent
  serverUrl: string;
  uploadBatchSize: number;       // default 5 — upload every 5 segments
}

// Inside the hook:
// 1. When startListening() is called AND training is enabled:
//    - Get the same MediaStream from getUserMedia
//    - Start a parallel MediaRecorder (WebM/Opus, timeslice=30000ms)
//    - Store blobs in an IndexedDB queue (survives page refresh)
//
// 2. On each Web Speech API onresult (final=true):
//    - Store the pair: { audioBlob, browserTranscript, timestamp }
//    - The browserTranscript is what Web Speech API produced
//
// 3. Background upload worker:
//    - When queue has >= uploadBatchSize items AND navigator.onLine:
//    - POST each to /training/browser-upload
//    - On success: remove from IndexedDB
//    - On failure: retry next time (exponential backoff)
//    - NEVER block the UI — use requestIdleCallback or Web Worker

// IndexedDB schema:
// Store: "training_queue"
// Key: auto-increment
// Value: {
//   audioBlob: Blob,
//   browserTranscript: string,
//   timestamp: number,
//   language: string,
//   uploaded: false
// }
```

#### Server-side: new endpoint

```
POST /training/browser-upload
Content-Type: multipart/form-data

Fields:
  audio: File                     # WebM/Opus blob
  browser_transcript: str         # what Web Speech API produced
  language: str
  timestamp: int

Response 200:
{
  "record_id": "...",
  "whisper_transcript": "...",    # server runs Whisper on the audio for comparison
  "processing_ms": 340
}
```

This endpoint does something uniquely valuable: it runs Whisper on audio that was *also* transcribed by the browser. Now you have triple-labeled data for every Path C dictation: browser output, Whisper output, and (eventually) the radiologist's approved text. This is excellent for comparative analysis.

#### Bandwidth and storage considerations

Each 2-minute segment ≈ 200-400KB of WebM/Opus. At 50 reports/day, worst case ≈ 20MB/day uploaded in background. On hospital WiFi this is negligible, but add a settings control:

```typescript
// In TranscriptionSettings:
browserTrainingUpload: boolean;    // default false — opt-in
browserTrainingWifiOnly: boolean;  // default true — use navigator.connection API
browserTrainingMaxMBPerDay: number; // default 50 — safety cap
```

#### Training record augmentation

When Path C data arrives at the server, the TrainingCollector creates a record with `transcription_mode: "browser"`. It runs Whisper on the audio server-side (async, low priority) and stores the comparison:

```python
class BrowserTrainingRecord(TrainingRecord):
    browser_transcript: str        # what the browser produced
    whisper_retrospective: str     # what Whisper produces on same audio
    # final_approved still comes from /training/finalize when report is signed
```

This lets you compute a "browser vs Whisper" accuracy comparison over time — useful for deciding when server mode is worth the latency tradeoff.

---

### 12.2 — Weaknesses identified and mitigations

#### WEAKNESS 1: Whisper is not thread-safe (CRITICAL)

**Problem:** `WhisperEngine` is a singleton loaded at startup. faster-whisper's underlying CTranslate2 model is not safely callable from multiple threads simultaneously. If two Path B POST requests arrive at the same time, or a Path A stream and a Path B request overlap, the model may produce corrupt output or crash.

**Mitigation:** Use an async request queue with a worker pattern.

```python
# In transcription/engine.py:

import asyncio
from collections import deque

class WhisperEngine:
    def __init__(self, settings: Settings):
        self.model = WhisperModel(...)
        self._queue: asyncio.Queue = asyncio.Queue()
        self._lock = asyncio.Lock()  # serialize all model calls

    async def transcribe_segment(self, audio_bytes: bytes, language: str) -> TranscriptionResult:
        async with self._lock:
            # Run in thread pool to avoid blocking event loop
            return await asyncio.to_thread(self._transcribe_sync, audio_bytes, language)

    def _transcribe_sync(self, audio_bytes: bytes, language: str) -> TranscriptionResult:
        # This runs in a thread but is serialized by the lock
        segments, info = self.model.transcribe(...)
        ...
```

For production with multiple concurrent users: deploy multiple server instances behind a load balancer, each with its own model instance. Or use a proper task queue (Celery + Redis) with GPU workers.

**Add to Phase 1 build tasks.**

#### WEAKNESS 2: Whisper hallucinations on silence/noise (CRITICAL FOR MEDICAL)

**Problem:** Whisper is known to hallucinate — it generates plausible-sounding text from silence, background noise, or music. In a radiology context, this could produce phantom findings. A silence gap could produce "there is a lesion in the..." from nothing.

**Mitigation:** Multi-layer hallucination detection.

```python
# In processing/hallucination_detector.py (NEW FILE):

class HallucinationDetector:
    """
    Detects likely Whisper hallucinations before text reaches the editor.
    """

    def check(self, result: TranscriptionResult, audio_chunk: bytes) -> HallucinationReport:
        flags = []

        # 1. VAD cross-check: if Silero VAD says < 20% of chunk was speech,
        #    but Whisper produced > 10 words, flag it
        speech_ratio = self.vad.speech_ratio(audio_chunk)
        word_count = len(result.text.split())
        if speech_ratio < 0.2 and word_count > 10:
            flags.append("LOW_SPEECH_HIGH_TEXT")

        # 2. Confidence threshold: Whisper provides per-segment avg_logprob.
        #    Hallucinated text typically has low confidence.
        if result.avg_logprob < -1.0:
            flags.append("LOW_CONFIDENCE")

        # 3. Repetition detection: hallucinations often repeat phrases
        if self._has_repetition(result.text, threshold=3):
            flags.append("REPETITIVE_OUTPUT")

        # 4. No-speech probability: Whisper outputs this per segment
        if result.no_speech_prob > 0.6:
            flags.append("HIGH_NO_SPEECH_PROB")

        # 5. Language mismatch: if we expect Polish but Whisper auto-detected
        #    English, the audio may be ambient TV/radio, not the radiologist
        if result.detected_language != expected_language:
            flags.append("LANGUAGE_MISMATCH")

        return HallucinationReport(
            is_suspect=len(flags) > 0,
            flags=flags,
            action="DROP" if len(flags) >= 2 else "FLAG"
        )
```

When `action="DROP"`, the segment is silently discarded (not sent to editor). When `action="FLAG"`, the text is sent to the editor but marked with a visual indicator (e.g., a subtle warning underline) so the radiologist knows to verify.

**Add to dictation-server file structure. Add to Phase 1 build tasks.**

#### WEAKNESS 3: Audio gap during fallback (HIGH)

**Problem:** When the server disconnects and the system falls back to browser mode (Path C), there's a gap. Audio produced during the switchover (2-5 seconds) is lost. For a radiologist mid-sentence, this means a missing chunk of their dictation.

**Mitigation:** Continuous local audio buffer.

```typescript
// In useServerTranscription.ts:

// ALWAYS run a local MediaRecorder as a safety buffer, regardless of mode.
// Keep a rolling 10-second audio buffer in memory.
// On server disconnect:
// 1. The buffer contains the last 10 seconds of audio
// 2. Switch to Path C (browser mode) immediately
// 3. POST the buffer contents to the server when it comes back online
//    (they'll be transcribed retrospectively and merged into the report)
// 4. Or: run them through Web Speech API locally for immediate (lower quality) text

class AudioSafetyBuffer {
  private chunks: Blob[] = [];
  private maxDurationMs = 10000;

  addChunk(blob: Blob) { ... }
  getBuffer(): Blob { ... }  // returns merged audio of last 10s
  clear() { ... }
}
```

**Add to Phase 3 build tasks (Path A streaming).**

#### WEAKNESS 4: contentEditable edit detection is fragile (HIGH)

**Problem:** The spec relies on detecting user edits to `.text-server` spans inside a `contentEditable` div via `InputEvent`. This is notoriously unreliable across browsers. Chrome, Safari, and Firefox handle `contentEditable` mutations differently. Edits that span multiple spans (selecting across two segments and deleting) can destroy the DOM structure.

**Mitigation:** Use `MutationObserver` instead of `InputEvent`.

```typescript
// In EditorPanel.tsx:

// Replace the InputEvent approach with MutationObserver:
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      const span = mutation.target.parentElement?.closest('.text-server');
      if (span) {
        debounceRecordEdit(span);
      }
    }
    if (mutation.type === 'childList') {
      // Handle span deletion/splitting
      reconcileServerSpans();
    }
  }
});

observer.observe(editorRef.current, {
  characterData: true,
  childList: true,
  subtree: true,
});

// debounceRecordEdit: wait 500ms after last keystroke before POSTing
// This prevents flooding the server during active typing
```

Also: snapshot the full editor HTML periodically (every 30 seconds) as a fallback ground truth source. If the fine-grained edit tracking fails, you still have periodic snapshots to diff against the original.

**Add to Phase 5 build tasks.**

#### WEAKNESS 5: Training edit endpoint has no rate limiting (MEDIUM)

**Problem:** `POST /training/edit` is called on every user correction. A fast typist correcting a long passage could trigger dozens of calls per second. This wastes bandwidth and could overwhelm the server.

**Mitigation:** Client-side debouncing + server-side rate limiting.

```typescript
// Client: debounce edits to same segment to max 1 per 2 seconds
const debouncedRecordEdit = debounce((sessionId, edit) => {
  transcriptionService.recordEdit(sessionId, edit);
}, 2000, { leading: false, trailing: true });
```

```python
# Server: rate limit per session
from fastapi import Request
from slowapi import Limiter
limiter = Limiter(key_func=lambda req: req.headers.get("X-Session-Id", "default"))

@app.post("/training/edit")
@limiter.limit("30/minute")
async def record_edit(request: Request, body: EditRequest):
    ...
```

**Add to Phase 5 build tasks.**

#### WEAKNESS 6: Unbounded storage growth (MEDIUM)

**Problem:** Training data accumulates forever. At ~10MB/day of audio, that's ~3.6GB/year. Manageable for one user, but if scaled to multiple radiologists, storage costs grow linearly.

**Mitigation:** Tiered retention policy.

```python
# In training/storage.py:

class RetentionPolicy:
    """
    Audio data is the bulk of storage. Text metadata is tiny.
    """
    # Raw audio: keep for 6 months (needed for fine-tuning)
    # After fine-tune: keep only audio that produced corrections
    #   (correct transcriptions are less valuable for training)
    # Text metadata: keep forever (tiny, valuable for metrics)
    # Exported datasets: keep permanently (compressed, versioned)

    raw_audio_retention_days: int = 180
    corrected_audio_retention_days: int = 365  # audio where user made fixes
    perfect_audio_retention_pct: float = 0.1    # keep 10% of perfect transcriptions
                                                 # (random sample for validation set)
```

Run a nightly cleanup job that applies the policy. Log what was deleted for audit.

**Add to Phase 5 configuration.**

#### WEAKNESS 7: No audio quality assessment (MEDIUM)

**Problem:** If the microphone is bad, background noise is high, or audio is clipping, the system doesn't warn you. Poor audio produces poor transcriptions AND poisons the training data.

**Mitigation:** Audio quality scoring on every incoming chunk.

```python
# In processing/audio_quality.py (NEW FILE):

class AudioQualityAnalyzer:
    """
    Runs on every audio chunk before transcription.
    """

    def analyze(self, audio: np.ndarray, sample_rate: int) -> AudioQuality:
        return AudioQuality(
            rms_db=self._rms_level(audio),        # volume level
            clipping_pct=self._clipping_ratio(audio),  # % samples at max
            snr_estimate=self._signal_to_noise(audio),  # signal vs noise floor
            background_noise_db=self._noise_floor(audio),

            # Actionable flags:
            too_quiet=rms_db < -35,              # "speak louder or move closer"
            clipping=clipping_pct > 0.01,         # "reduce microphone gain"
            noisy=snr_estimate < 10,              # "noisy environment detected"
            quality_score=0-100,                   # overall quality for training

            # Training data decision:
            suitable_for_training=quality_score > 40,
        )
```

Send quality data to the client via the WebSocket status messages (Path A) or in the POST response (Path B). The `ServerStatusIndicator` component can show a small volume meter or quality warning.

Audio with `suitable_for_training=False` is still transcribed (the radiologist needs their report) but NOT stored for training. This prevents garbage data from degrading future models.

**Add to dictation-server file structure. Add to Phase 1 build tasks.**

#### WEAKNESS 8: LLM prompt versioning is unspecified (MEDIUM)

**Problem:** The training record stores `llm_prompt_version` but the spec never defines how prompts are versioned or where they live. If you change the system prompt, the metrics shift — but you can't attribute the change.

**Mitigation:** Version prompts as named files with semantic versions.

```
dictation-server/
├── prompts/
│   ├── radiology_polish_v1.0.txt
│   ├── radiology_polish_v1.1.txt   # improved measurement formatting
│   ├── radiology_polish_v2.0.txt   # added [VERIFY] flagging
│   └── manifest.json               # { "active": "v2.0", "history": [...] }
```

```python
# In config.py:
llm_prompt_version: str = "v2.0"    # maps to prompts/radiology_polish_v2.0.txt
```

The training record stores the version string. The metrics dashboard can filter by prompt version to see if a prompt change helped or hurt.

**Add to Phase 4 build tasks.**

#### WEAKNESS 9: No WebSocket reconnection strategy (MEDIUM)

**Problem:** The spec says "fallback to browser on WebSocket disconnect" but doesn't distinguish between a brief network glitch (2 seconds) and a real server outage. Full fallback for a 2-second hiccup is disruptive.

**Mitigation:** Graduated reconnection with buffering.

```typescript
// In useServerTranscription.ts (stream mode):

class WebSocketManager {
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private backoffMs = [500, 1000, 2000, 4000, 8000];

  onDisconnect() {
    // Phase 1: Buffer locally (0-5 seconds)
    // Audio continues recording to local buffer
    // UI shows "Reconnecting..." indicator (yellow dot)
    this.startLocalBuffer();

    // Phase 2: Reconnect attempts (5-30 seconds)
    // Try to reconnect with exponential backoff
    // If reconnect succeeds: flush buffer to server
    this.attemptReconnect();

    // Phase 3: Fallback (30+ seconds)
    // All attempts failed — switch to Path C
    // Upload buffered audio later for retrospective processing
    if (this.reconnectAttempts >= this.maxReconnects) {
      this.fallbackToBrowser();
    }
  }

  onReconnect() {
    // Flush buffered audio to server
    // Resume streaming from current position
    this.reconnectAttempts = 0;
    this.flushBuffer();
  }
}
```

**Add to Phase 3 build tasks.**

#### WEAKNESS 10: 7-deep provider stack performance (LOW — inherited from existing app)

**Problem:** From your existing app documentation: "7-deep provider stack — any frequently-updated context re-renders everything below. SettingsContext is the main offender." Adding TranscriptionMode state to this stack could make it worse.

**Mitigation:** Keep transcription state OUT of the provider stack. Use a standalone hook with `useRef` for mutable state and `useSyncExternalStore` for the React-facing state. The transcription engine runs independently; only the text output touches React via callbacks.

```typescript
// useServerTranscription should manage its own state internally
// with refs, not context. Only expose the return values via
// a shallow state object that rarely changes:
const [state, setState] = useState({
  isListening: false,
  isConnected: false,
  isProcessing: false,
  serverLatency: 0,
});
// Update this state object sparingly — only on actual transitions
// NOT on every audio chunk or partial result
```

**No additional phase needed — this is a design constraint for Phase 2-3 implementation.**

---

### 12.3 — Advanced features (future phases)

These are opportunities identified during the review. None are required for MVP, but some are natural extensions of what's already being built.

#### ADVANCED 1: Voice commands

**Value:** High. Radiologists already use voice commands with Dragon ("period", "new paragraph", "scratch that"). Your existing app partially handles these with spoken punctuation commands. A server-side command parser would be much more powerful.

```python
# In processing/voice_commands.py (NEW FILE):

class VoiceCommandParser:
    """
    Detects and executes voice commands in the transcription stream.
    Runs AFTER Whisper, BEFORE domain correction.

    Commands are detected by pattern matching on the raw text,
    then stripped from the text before it reaches the editor.
    """

    COMMANDS = {
        # Navigation
        "go to findings": Action.JUMP_TO_SECTION("findings"),
        "go to impression": Action.JUMP_TO_SECTION("impression"),

        # Editing
        "scratch that": Action.DELETE_LAST_SENTENCE,
        "delete last sentence": Action.DELETE_LAST_SENTENCE,
        "undo": Action.UNDO,

        # Templates
        "insert normal chest": Action.INSERT_TEMPLATE("chest_xray_normal"),
        "insert normal brain": Action.INSERT_TEMPLATE("mri_brain_normal"),

        # Formatting
        "new paragraph": Action.NEW_PARAGRAPH,
        "period": Action.INSERT("."),
        "comma": Action.INSERT(","),
        "colon": Action.INSERT(":"),

        # Control
        "stop dictation": Action.STOP_LISTENING,
        "switch to segment mode": Action.SWITCH_MODE("segment"),

        # Polish-specific
        "kropka": Action.INSERT("."),
        "nowy akapit": Action.NEW_PARAGRAPH,
        "usuń ostatnie zdanie": Action.DELETE_LAST_SENTENCE,
    }

    def parse(self, text: str, language: str) -> ParseResult:
        """
        Returns: remaining text (with commands stripped) + list of actions
        """
        ...
```

The server sends command actions as a new WebSocket message type:
```json
{"type": "command", "action": "DELETE_LAST_SENTENCE"}
{"type": "command", "action": "INSERT_TEMPLATE", "template_id": "chest_xray_normal"}
```

The client handles these in the editor.

**Recommended phase:** After Phase 4, as a standalone feature.

#### ADVANCED 2: Shadow model testing (A/B comparison)

**Value:** High for fine-tuning validation. When you deploy a fine-tuned model, you can't know if it's better without using it for 2 weeks. Shadow testing solves this.

```python
# In transcription/engine.py:

class WhisperEngine:
    def __init__(self, settings: Settings):
        self.primary_model = WhisperModel(settings.whisper_model, ...)
        self.shadow_model = None

    def enable_shadow(self, shadow_model_path: str):
        """Load a second model for comparison testing."""
        self.shadow_model = WhisperModel(shadow_model_path, ...)

    async def transcribe_with_shadow(self, audio: bytes, language: str):
        primary_result = await self.transcribe_segment(audio, language)

        if self.shadow_model:
            # Run shadow model async, don't block response
            shadow_result = await asyncio.to_thread(
                self.shadow_model.transcribe, audio, language
            )
            # Store both results in training data for comparison
            # The user only sees primary_result
            await self.collector.record_shadow_comparison(
                primary_result, shadow_result
            )

        return primary_result
```

Before deploying a fine-tuned model to production, load it as the shadow. After a week, compare the shadow's accuracy against the primary. If the shadow is better, promote it.

**Recommended phase:** Before CHECKPOINT_2 (first fine-tune).

#### ADVANCED 3: Audio preprocessing / noise reduction

**Value:** Medium-high. Reading rooms have ambient noise — HVAC, other radiologists dictating, phones. Cleaning audio before Whisper improves accuracy AND training data quality.

```python
# In processing/audio_preprocess.py (NEW FILE):

class AudioPreprocessor:
    """
    Lightweight audio cleanup before Whisper.
    """

    def process(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        # 1. Volume normalization (target -20 dBFS)
        audio = self._normalize_volume(audio, target_db=-20)

        # 2. High-pass filter (remove rumble below 80Hz — HVAC, building hum)
        audio = self._highpass(audio, cutoff_hz=80, sample_rate=sample_rate)

        # 3. Spectral gating for noise reduction (noisereduce library)
        #    Uses first 500ms of each session as noise profile
        audio = self._spectral_gate(audio, noise_profile=self._noise_profile)

        return audio
```

Add `noisereduce` to requirements.txt. The noise profile is captured during the first 500ms of silence when dictation starts (before the radiologist speaks).

**Recommended phase:** Phase 4 (polish and edge cases).

#### ADVANCED 4: Smart template suggestion

**Value:** Medium. Based on the first few seconds of dictation, auto-suggest a report template.

```python
# In processing/template_detector.py (NEW FILE):

class TemplateDetector:
    """
    Listens to the first segment of dictation and suggests a template.
    Uses keyword matching initially, could be upgraded to a classifier later.
    """

    TRIGGER_PHRASES = {
        "chest_xray": ["chest x-ray", "pa and lateral", "chest radiograph",
                        "rtg klatki", "zdjęcie pa"],
        "ct_head": ["ct of the head", "ct brain", "ct głowy", "tk głowy"],
        "mri_brain": ["mri of the brain", "mr brain", "mr mózgu"],
        "ct_abdomen": ["ct of the abdomen", "ct brzucha", "tk jamy brzusznej"],
        # ...extend based on your existing templates
    }

    def detect(self, first_segment: str, language: str) -> str | None:
        """Returns template_type or None."""
        text_lower = first_segment.lower()
        for template_type, triggers in self.TRIGGER_PHRASES.items():
            if any(trigger in text_lower for trigger in triggers):
                return template_type
        return None
```

When detected, the server includes `"suggested_template": "chest_xray"` in the response. The client can auto-select the template or show a suggestion toast.

**Recommended phase:** Phase 4.

#### ADVANCED 5: Critical finding auto-detection

**Value:** High for patient safety. If the LLM polish step detects urgent findings, flag them prominently.

Add to the LLM system prompt:
```
CRITICAL FINDINGS DETECTION:
If the dictation contains any of the following, add a [CRITICAL] tag:
- Pneumothorax
- Pulmonary embolism
- Aortic dissection
- Intracranial hemorrhage
- Stroke / acute infarction
- Tension pneumothorax
- Free air (pneumoperitoneum)
- Ectopic pregnancy
- Testicular torsion
- Spinal cord compression

Format: [CRITICAL: Pneumothorax detected in right lung]
Place at the TOP of the report, before TECHNIQUE.
```

The client watches for `[CRITICAL]` in the polished output and renders it as a red banner at the top of the editor. This is NOT a diagnostic tool — it's a reminder for the radiologist to ensure appropriate communication has occurred.

**Recommended phase:** Phase 4 (add to LLM prompt), with UI in Phase 6.

#### ADVANCED 6: Per-study-type accuracy tracking

**Value:** Medium. Some study types are harder than others. MRI brain dictations use more complex vocabulary than chest X-rays. Tracking accuracy per study type tells you where to focus dictionary and training efforts.

Add `study_type` as a dimension in the metrics:

```python
# In training/metrics.py:
async def compute_daily_by_study_type(self, date: str) -> dict[str, DailyMetrics]:
    """Returns metrics broken down by study type."""
    # This reveals: "My chest X-ray correction rate is 1.2, but MRI brain is 8.4"
    # Tells you exactly where to focus dictionary work
    ...
```

The Training Dashboard would show a breakdown table or small multiples chart.

**Recommended phase:** Phase 6 (metrics dashboard).

#### ADVANCED 7: Radiologist voice profile

**Value:** Medium-long-term. When scaling to multiple radiologists, each has different speech patterns, accents, dictation speed, and vocabulary preferences. A per-user voice profile improves Whisper accuracy.

This isn't a separate feature — it emerges naturally from the training data. When you fine-tune, you can either:
- Train one model on all radiologists' data (more data, averaged accuracy)
- Train per-radiologist LoRA adapters (less data, personalized accuracy)

The data collection already tags `radiologist_id` on every record. At fine-tuning time, you choose the strategy. Per-radiologist adapters are tiny (a few MB each) and can be hot-swapped based on who's logged in.

```python
# In config.py (future):
whisper_adapter_dir: str = "/models/adapters/"

# At request time:
adapter_path = f"{adapter_dir}/{radiologist_id}.bin"
if os.path.exists(adapter_path):
    engine.load_adapter(adapter_path)
```

**Recommended phase:** After CHECKPOINT_4 (second fine-tune), when there's enough per-user data.

---

## Part 13 — Smartphone as microphone input

### Why this matters

Many hospital workstations don't have microphones. Buying, configuring, and maintaining USB microphones across a radiology department is a procurement and IT headache. But every radiologist already has a smartphone with a perfectly good microphone in their pocket. Modern phone mics are actually excellent — they have noise cancellation hardware, multi-mic beam-forming, and are designed for speech.

Your existing codebase already has the hook: `useSpeechRecognition.ts` accepts an optional `remoteAudioStream: MediaStream` prop. The architecture is a phone-side PWA that captures audio and streams it to the desktop browser, which injects it as a `MediaStream` into the existing pipeline. All three transcription paths (A, B, C) work identically — they don't care whether the audio came from a local USB mic or a phone across the room.

### Architecture: two options

#### Option 1: WebSocket relay via your server (RECOMMENDED — simpler)

The phone sends audio over WebSocket to your FastAPI server. The server relays it to the desktop client's WebSocket. This reuses your existing server infrastructure and works reliably through hospital firewalls.

```
Phone (PWA)
  └─ getUserMedia → AudioWorklet (Opus encode)
       └─ WebSocket → dictation-server /mic-relay
                           └─ WebSocket → Desktop browser
                                              └─ Decode → MediaStream
                                                   └─ remoteAudioStream prop
```

Latency: ~50-150ms on hospital WiFi. Imperceptible for dictation.

#### Option 2: WebRTC peer-to-peer (lower latency, harder to set up)

Direct audio stream from phone to desktop, no server in the middle. Lower latency (~20-50ms), but requires STUN/TURN configuration which is tricky behind hospital firewalls and NATs.

**Recommendation: start with Option 1.** It reuses your server, works behind any firewall, and the latency difference (50ms vs 20ms) is irrelevant for speech. Switch to WebRTC later only if latency becomes a real issue.

### Phone-side PWA

This is a minimal web app — one page, no framework needed. Hosted at something like `mic.yourdomain.com`.

#### File structure

```
mic-pwa/
├── index.html          # Single page: connect button, status, volume meter
├── app.js              # Audio capture + WebSocket streaming
├── manifest.json       # PWA manifest for home screen install
├── sw.js               # Service worker (minimal — caching only)
└── icons/              # PWA icons
```

#### Core functionality (app.js)

```javascript
class PhoneMic {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.stream = null;
    this.sessionCode = null;
  }

  async connect(sessionCode) {
    // 1. Get microphone permission
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,       // 16kHz is optimal for Whisper
        channelCount: 1,          // mono
      }
    });

    // 2. Set up AudioWorklet for encoding
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.stream);

    // Use AudioWorklet to encode to Opus and send chunks
    await this.audioContext.audioWorklet.addModule('encoder-worklet.js');
    const encoder = new AudioWorkletNode(this.audioContext, 'opus-encoder');
    source.connect(encoder);

    // 3. Connect WebSocket to server relay
    this.ws = new WebSocket(
      `wss://your-server.com/mic-relay?session=${sessionCode}`
    );

    // 4. Stream encoded audio chunks
    encoder.port.onmessage = (event) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(event.data);  // binary Opus frames
      }
    };

    // 5. Keep-alive and reconnection
    this.ws.onclose = () => this.reconnect();
  }

  // Volume meter for visual feedback on phone screen
  getVolume() {
    // Returns 0-100 for UI display
    // Uses AnalyserNode on the raw stream
    ...
  }
}
```

#### Phone UI (index.html)

The phone screen is deliberately minimal — the radiologist glances at it once to confirm connection, then puts the phone down.

```
┌─────────────────────────┐
│                         │
│   ┌─────────────────┐   │
│   │  Enter room code │   │
│   │  [____] [Connect]│   │
│   └─────────────────┘   │
│                         │
│   ● Connected to desk   │
│   ████████░░░░  62%     │  ← volume meter
│                         │
│   Mic: Active           │
│   WiFi: Strong          │
│   Battery: 84%          │
│                         │
│   [Mute]  [Disconnect]  │
│                         │
└─────────────────────────┘
```

After first connection, the phone remembers the session and auto-connects next time the PWA is opened. Add-to-home-screen makes it one tap to start.

### Server-side: relay endpoint

#### New endpoint: WebSocket /mic-relay

```python
# In main.py:

# Session registry: maps session codes to connected desktop clients
mic_sessions: dict[str, WebSocket] = {}

@app.websocket("/mic-relay")
async def mic_relay(websocket: WebSocket, session: str):
    """
    Two connection types on same endpoint, distinguished by first message:
    - Desktop connects with {"type": "host", "session": session_code}
    - Phone connects with {"type": "mic", "session": session_code}

    Audio flows: phone → server → desktop (pure relay, no processing)
    The server does NOT transcribe this audio — it just forwards it.
    Transcription happens on the desktop side via the normal paths.
    """
    await websocket.accept()
    first_msg = await websocket.receive_json()

    if first_msg["type"] == "host":
        # Desktop registering a session
        mic_sessions[session] = websocket
        try:
            while True:
                await websocket.receive()  # keep alive
        finally:
            del mic_sessions[session]

    elif first_msg["type"] == "mic":
        # Phone connecting to stream audio
        desktop_ws = mic_sessions.get(session)
        if not desktop_ws:
            await websocket.close(4004, "No desktop session found")
            return

        try:
            while True:
                data = await websocket.receive_bytes()
                await desktop_ws.send_bytes(data)  # relay to desktop
        except:
            pass  # phone disconnected
```

#### Session code generation

```python
@app.post("/mic-session")
async def create_mic_session():
    """
    Desktop calls this to get a session code for pairing.
    Returns a short code the radiologist types into their phone,
    or a URL/QR code they can scan.
    """
    code = generate_short_code()  # 4-6 alphanumeric, e.g. "X7K2"
    return {
        "session_code": code,
        "connect_url": f"https://mic.yourdomain.com?session={code}",
        "qr_data": f"https://mic.yourdomain.com?session={code}",
        "expires_in": 300,  # 5 minutes to pair
    }
```

### Desktop-side: receiving phone audio

#### New file: services/phoneMicService.ts

```typescript
class PhoneMicService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;

  async startSession(serverUrl: string): Promise<SessionInfo> {
    // 1. Call POST /mic-session to get a code
    const res = await fetch(`${serverUrl}/mic-session`, { method: 'POST' });
    const session = await res.json();

    // 2. Connect desktop WebSocket to relay
    this.ws = new WebSocket(
      `${serverUrl.replace('http', 'ws')}/mic-relay?session=${session.session_code}`
    );
    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'host', session: session.session_code }));
    };

    // 3. When phone audio arrives, reconstruct as MediaStream
    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.feedAudioChunk(event.data);
      }
    };

    return session;  // includes session_code and QR data
  }

  private feedAudioChunk(opusData: ArrayBuffer) {
    // Decode Opus frames back to PCM
    // Feed into a MediaStreamSource
    // This produces a MediaStream that can be passed to
    // useSpeechRecognition's remoteAudioStream prop
    // OR to useServerTranscription's audio source
    ...
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }
}
```

#### New component: PhoneMicPairing.tsx

```typescript
// Shows in the toolbar or settings when no local mic is detected
// or when user explicitly chooses phone mic

interface PhoneMicPairingProps {
  onConnected: (stream: MediaStream) => void;
}

// UI flow:
// 1. User clicks "Use phone as mic"
// 2. Component shows a 4-digit code + QR code
//    "Open mic.yourdomain.com on your phone and enter: X7K2"
//    [QR CODE]
// 3. When phone connects, code disappears, shows:
//    "📱 Phone connected  ●  Signal: good"
// 4. Calls onConnected(mediaStream) — the parent wires this
//    into whichever transcription hook is active

// QR code: use a lightweight library (qrcode.js via CDN)
// or generate server-side as SVG
```

### Integration with existing code

The key integration point is clean. Your `useSpeechRecognition.ts` already accepts `remoteAudioStream`. The new `useServerTranscription.ts` should accept the same prop:

```typescript
// In the parent component that manages transcription mode:

const phoneMic = usePhoneMic(settings.serverUrl);

// Pass to whichever hook is active:
const speechRx = useSpeechRecognition({
  ...options,
  remoteAudioStream: phoneMic.stream,  // already supported
});

const serverTx = useServerTranscription({
  ...options,
  audioSource: phoneMic.stream || localMicStream,  // NEW prop
});
```

When `phoneMic.stream` is provided, the hooks use it instead of calling `getUserMedia` locally. The rest of the pipeline is identical.

### Audio source selector

Add a source selector alongside the transcription mode selector:

```
┌────────────────────────────────────────────────────┐
│  Mode:   🌐 Browser  │  📡 Segment  │  🔴 Live    │
│  Source: 🎙️ Desktop   │  📱 Phone    │  🔧 Custom  │
└────────────────────────────────────────────────────┘
```

"Desktop" = local getUserMedia (default)
"Phone" = opens the pairing flow
"Custom" = manual WebSocket URL (for the existing Android companion app or other custom inputs)

### Practical considerations

**WiFi dependency:** This only works on the same network. Hospital WiFi is usually available in reading rooms. If WiFi drops, the phone disconnects and the app can fall back to desktop mic or browser mode. The `AudioSafetyBuffer` (from Weakness 3 mitigation) covers the gap.

**Battery:** Continuous audio streaming from the phone uses moderate battery — roughly 5-8% per hour. For a full day of dictation (8 hours), the radiologist would want to keep the phone plugged in. The PWA UI should show battery level.

**Audio quality advantage:** Phone microphones are often *better* than cheap USB desktop mics. Modern phones have hardware noise cancellation, beam-forming microphone arrays, and are optimized for voice. Holding the phone or clipping it to a coat lapel gives consistent, close-range audio that Whisper handles very well.

**Screen lock:** The PWA needs to request a wake lock (`navigator.wakeLock`) to prevent the phone screen from turning off during dictation. Without this, iOS and Android will suspend the audio stream after 30-60 seconds.

**Latency budget:** Phone mic → Opus encode (5ms) → WiFi to server (10-30ms) → relay to desktop (10-30ms) → decode (5ms) = roughly 30-100ms total. This is well within acceptable range for dictation — Dragon Medical's wireless microphones add similar latency.

### Training data from phone mic

Phone mic audio flows through the exact same transcription and training pipeline as desktop mic audio. The `TrainingRecord` gets an additional field:

```python
class TrainingRecord:
    # ... existing fields ...
    audio_source: str    # "desktop_mic" | "phone_mic" | "custom"
    audio_device: str    # "iPhone 15 Pro" or "USB Audio Device" etc.
```

This is valuable because if you later train per-device models or want to analyze whether phone vs desktop mic produces better accuracy, the data is already tagged.

### Build order

**Phase 8 (days 17-19): Smartphone microphone input**

1. Create `mic-pwa/` — minimal PWA with audio capture and WebSocket streaming
2. Add `WebSocket /mic-relay` endpoint to server — pure audio relay
3. Add `POST /mic-session` endpoint — session code generation
4. Create `PhoneMicService.ts` — desktop-side WebSocket client and audio reconstruction
5. Create `PhoneMicPairing.tsx` — QR code / room code pairing UI
6. Add `audioSource` prop to `useServerTranscription.ts`
7. Wire phone mic stream into existing `remoteAudioStream` prop for Path C
8. Add audio source selector to toolbar
9. Test: pair phone, dictate, verify audio flows through all three paths
10. Test: phone disconnect → graceful fallback to desktop mic or browser mode

---

## Part 14 — Clinical intelligence features (inspired by Rad AI)

These features adapt five key capabilities from Rad AI's platform to work at solo/small-practice scale. None require enterprise integrations. Most are LLM prompt additions or lightweight modules built on data already being collected.

### 14.1 — Auto-impression generation

**What Rad AI does:** Radiologists dictate up to 35% fewer words. The impression populates in 0.5 to 3 seconds after dictating findings. Omni Impressions automatically generates a customized impression from the findings and clinical indication dictated by the radiologist, customized to each individual radiologist's exact language preferences by learning from their historical reports.

**What you build:** Add to the LLM polish system prompt:

```
AUTO-IMPRESSION RULES:
If the dictation contains FINDINGS but no explicit IMPRESSION section,
generate an IMPRESSION section that:
1. Summarizes key positive findings, ordered by clinical significance
2. Numbers each impression point
3. References measurements and laterality from findings
4. Uses standard radiology impression phrasing
5. Marks the section: IMPRESSION [AI-GENERATED — verify before signing]

STYLE ADAPTATION:
When style_examples are provided, match the impression style to the
radiologist's historical patterns:
- Length preference (terse vs detailed)
- Numbering style (numbered list vs narrative)
- Abbreviation conventions
- How they phrase negatives ("no evidence of" vs "negative for")
- Whether they include follow-up recommendations in impression
```

The `style_examples` parameter already exists in `LLMPolisher.polish()`. Feed it 5-10 of your most recent signed reports of the same study type. The LLM learns your impression style from examples, not from a separate training step.

**Implementation in the editor:**

```typescript
// When the polished report arrives with [AI-GENERATED] impression:
// 1. Insert it at the bottom of the editor
// 2. Visually distinguish it (subtle background, "AI" badge)
// 3. The radiologist reviews, edits if needed, removes the tag on approval
// 4. If they delete it entirely and dictate their own → log this as a
//    training signal (the AI impression wasn't useful for this case)
```

**Efficiency metric to track:** Words dictated per report, before vs after enabling auto-impression. Target: 20-35% reduction.

### 14.2 — Follow-up recommendation extraction and tracking

**What Rad AI does:** Rad AI Continuity closes the loop on follow-up recommendations for significant incidental findings in radiology reports. Using AI-driven automation, Continuity ensures that appropriate patient follow-up is communicated and completed.

**What you build:** A post-processing step after LLM polish that extracts structured follow-up data.

#### Server-side: processing/followup_extractor.py (NEW FILE)

```python
class FollowUpExtractor:
    """
    Runs on every polished report.
    Uses the LLM to extract structured follow-up recommendations.
    Stores them in Supabase for tracking.
    """

    async def extract(self, polished_text: str, study_type: str, language: str) -> list[FollowUp]:
        """
        LLM prompt extracts:
        {
          "recommendations": [
            {
              "modality": "CT",
              "body_part": "chest",
              "timeframe": "3 months",
              "urgency": "routine",        # routine | urgent | stat
              "clinical_reason": "pulmonary nodule follow-up",
              "original_text": "Zalecana kontrolna TK klatki piersiowej za 3 miesiące",
              "guideline": "Fleischner 2017"   # if applicable
            }
          ]
        }
        """
        ...

    async def store(self, session_id: str, followups: list[FollowUp]):
        """Save to Supabase follow_ups table."""
        ...

    async def get_pending(self, radiologist_id: str) -> list[FollowUp]:
        """
        Returns follow-ups that are now due or overdue.
        Called by the dashboard on load.
        """
        ...

    async def get_weekly_digest(self, radiologist_id: str) -> WeeklyDigest:
        """
        Summary for the dashboard:
        - X follow-ups recommended this week
        - Y follow-ups from previous months now due
        - Z follow-ups with no recorded completion
        """
        ...
```

#### Client-side: FollowUpTracker component

Add a small section to the Training Dashboard (or as its own tab):

```typescript
// Display:
// 1. "This week" card: N new follow-ups recommended
// 2. "Coming due" card: N follow-ups from past reports reaching their timeframe
// 3. Table of all follow-ups with status:
//    - Pending (timeframe not yet reached)
//    - Due (timeframe reached, no completion noted)
//    - Completed (manually marked)
//    - Overdue (>2 weeks past due date)
// 4. Each row shows: study date, modality, body part, timeframe, status
// 5. Click to mark as completed or dismiss
```

This is a personal safety net — you're not sending patient communication like Rad AI, but you're tracking your own recommendations so nothing slips. At the end of each week, glance at the dashboard: "I recommended 3 follow-up CTs this week, and 2 follow-ups from January are now due."

### 14.3 — Consensus guideline auto-insertion

**What Rad AI does:** Rad AI Omni includes consensus guideline recommendations, such as Fleischner and Lung-RADS, in practice-specific language. Automated insertion of consensus guideline recommendations means no more searching for white papers or scrolling to find the right macro.

**What you build:** Add a guideline knowledge base to the LLM prompt, triggered by specific findings.

```
CONSENSUS GUIDELINE INSERTION:
When the dictation mentions findings that have established management guidelines,
include the appropriate recommendation in the IMPRESSION section.

Trigger findings and guidelines:
- Pulmonary nodule (any size) → Fleischner Society 2017 guidelines
  Include size-based recommendation and follow-up interval
- Thyroid nodule on CT/MRI → ACR TI-RADS (if ultrasound recommended)
- Liver lesion on CT/MRI → ACR LI-RADS category if applicable
- Adrenal nodule → size-based follow-up per ACR guidelines
- Renal cyst → Bosniak classification and follow-up
- Ovarian cyst → ACR O-RADS (if ultrasound recommended)
- Aortic aneurysm → Society for Vascular Surgery follow-up intervals
- Incidental pancreatic cyst → ACR white paper recommendations

Format: "Per [guideline name], [recommendation]."
Language: Match the report language (Polish/English/German)

IMPORTANT: Only insert guidelines you are confident about.
If uncertain, note: "[VERIFY: Consider applying Fleischner criteria]"
rather than inserting a potentially incorrect recommendation.
```

Store the guideline reference texts as versioned files alongside the LLM prompts:

```
dictation-server/
├── prompts/
│   ├── radiology_polish_v2.0.txt
│   ├── guidelines/
│   │   ├── fleischner_2017.txt      # summarized for LLM context
│   │   ├── tirads.txt
│   │   ├── lirads.txt
│   │   ├── bosniak.txt
│   │   └── manifest.json            # versions and update dates
│   └── manifest.json
```

This ensures the LLM has the correct guideline text in its context window, not relying on training knowledge that might be outdated.

### 14.4 — Dictation efficiency analytics (personal coaching)

**What Rad AI does:** Real-time analytics highlight opportunities to shorten dictation and streamline templates.

**What you build:** A weekly batch analysis of your accumulated reports. This runs server-side as a scheduled job or on-demand from the dashboard.

#### Server-side: training/efficiency_analyzer.py (NEW FILE)

```python
class EfficiencyAnalyzer:
    """
    Analyzes accumulated report data to find optimization opportunities.
    Runs weekly (or on-demand) using the LLM to analyze patterns.
    """

    async def analyze_week(self, radiologist_id: str, week: str) -> EfficiencyReport:
        """
        Pulls all signed reports from the week.
        Sends a batch to the LLM for pattern analysis.
        """
        reports = await self.storage.get_reports(radiologist_id, week)

        analysis = await self.llm.analyze(
            prompt="""
            Analyze these {count} radiology reports and identify:

            1. REPEATED PHRASES: Exact phrases appearing in >25% of reports.
               For each: the phrase, frequency, and a suggested short voice command.
               Example: "No acute cardiopulmonary process" appears in 38 reports
               → suggest voice command "normal chest impression"

            2. TEMPLATE OPPORTUNITIES: Study types where >60% of reports share
               similar structure. These should become templates if they aren't already.

            3. CORRECTION HOTSPOTS: Report sections where user corrections
               cluster. These indicate prompt tuning opportunities.

            4. TIME OUTLIERS: Study types taking significantly longer than average.
               Identify why (more complex vocab? more corrections? longer dictation?).

            5. DICTATION STYLE DRIFT: Compare early-week vs late-week reports.
               Is quality or completeness declining toward end of shift?
               (indicator of fatigue)

            Respond in JSON format.
            """,
            data=reports
        )
        return analysis
```

#### New endpoint

```
GET /training/efficiency?week=2026-W16

Response 200:
{
  "repeated_phrases": [
    {
      "phrase": "Bez zmian w porównaniu z badaniem z dnia",
      "frequency": 34,
      "pct_of_reports": 0.68,
      "suggested_command": "porównanie bez zmian",
      "potential_savings_sec": 5
    },
    ...
  ],
  "template_opportunities": [
    {
      "study_type": "chest_xray",
      "reports_analyzed": 42,
      "structural_similarity": 0.85,
      "suggestion": "Generate personal template from these 42 reports"
    }
  ],
  "correction_hotspots": [
    {
      "section": "findings",
      "common_corrections": ["hipokampus", "mezenchymalny"],
      "suggestion": "Add these to dictionary"
    }
  ],
  "time_outliers": [
    {
      "study_type": "mri_brain",
      "avg_dictation_sec": 240,
      "vs_overall_avg_sec": 120,
      "reason": "High correction rate on neuroanatomy terms"
    }
  ],
  "fatigue_indicator": {
    "early_shift_corrections": 3.2,
    "late_shift_corrections": 7.8,
    "trend": "significant_increase"
  }
}
```

#### Client-side: EfficiencyInsights component

Add as a section in the Training Dashboard:

```typescript
// Weekly coaching card:
// "This week's insights"
//
// 💡 "You dictated 'bez zmian w porównaniu' 34 times.
//     Save 3 min/day with a voice shortcut?"
//     [Create shortcut] button → adds to voice commands
//
// 📋 "Your chest X-ray reports are 85% structurally similar.
//     Generate a personal template?"
//     [Generate template] button → calls LLM to create template
//
// ⚠️ "Your correction rate doubles after 4pm.
//     Consider switching to Segment mode for evening shifts."
//
// 📚 "Add 'mezenchymalny' to dictionary? You've corrected it 12 times."
//     [Add to dictionary] button → POST to domain correction
```

### 14.5 — Personal template generation from your style

**What Rad AI does:** Omni Unchanged extracts stable and unchanged findings from prior reports and inserts them into the proper location within the radiologist's existing preferred report template. Radiologists can dictate up to 90% fewer words, saving up to 50% of time spent dictating a single report.

**What you build:** Two features combined.

#### Feature A: Auto-generate personal templates

After 50+ signed reports of a given study type, generate a template that matches your actual writing style:

```python
class PersonalTemplateGenerator:
    """
    Analyzes signed reports to extract the radiologist's personal
    template for each study type.
    """

    async def generate(
        self,
        radiologist_id: str,
        study_type: str,
        min_reports: int = 50,
    ) -> PersonalTemplate:
        """
        LLM prompt:
        "Analyze these {n} signed {study_type} reports from one radiologist.
         Extract their personal report template including:
         - Their typical section ordering
         - Their standard 'normal' phrasing for each anatomy/structure
         - Their impression style (numbered vs narrative, terse vs detailed)
         - Their comparison phrasing
         - Their technique description style
         - Common sign-off patterns

         Generate a reusable template in the radiologist's own language
         and style that can be used as a starting point for future reports
         of this type. Mark variable sections with [___] placeholders.
         Include their most common 'normal findings' text as defaults.

         Language: {language}"
        """
        reports = await self.storage.get_signed_reports(
            radiologist_id, study_type, limit=100
        )
        template = await self.llm.generate_template(reports)
        return template
```

#### Feature B: "Unchanged" findings from prior

When a follow-up study is being dictated, and the radiologist says something like "porównanie z badaniem z dnia [date]" or "compared to prior", the system can:

1. Detect the comparison reference (via voice command or LLM detection)
2. Pull the prior report from your stored reports (in Supabase)
3. Pre-populate unchanged findings with "[UNCHANGED]" markers
4. The radiologist only dictates what's different

```python
class PriorReportMatcher:
    """
    When the radiologist references a prior study, this module:
    1. Finds the prior report in storage
    2. Extracts the findings section
    3. Sends both to the LLM to identify what's unchanged
    4. Returns a pre-populated report with unchanged findings filled in
    """

    async def match_and_prepopulate(
        self,
        current_dictation: str,
        study_type: str,
        radiologist_id: str,
    ) -> PrepopulatedReport:
        # Find the most recent prior report of the same study type
        prior = await self.storage.find_prior_report(
            radiologist_id, study_type
        )
        if not prior:
            return None

        # LLM compares current dictation with prior report
        result = await self.llm.compare_and_prepopulate(
            prompt="""
            PRIOR REPORT:
            {prior_text}

            CURRENT DICTATION (partial):
            {current_dictation}

            Identify findings from the prior report that the current
            dictation has NOT mentioned or contradicted. These are
            likely unchanged. Return a structured report where:
            - New/changed findings use the current dictation text
            - Unchanged findings are prefilled from the prior, marked
              with [UNCHANGED] tag
            - Removed/resolved findings are noted as [RESOLVED]

            The radiologist will review and confirm all [UNCHANGED] items.
            """,
            prior_text=prior.text,
            current_dictation=current_dictation,
        )
        return result
```

This is the feature that produces the biggest time savings for follow-up studies. An MRI brain follow-up might have 15 findings in the prior, with only 2 that changed. Instead of re-dictating all 15, the radiologist dictates the 2 changes and everything else is carried forward.

### 14.6 — Confidence scoring and error catching

**What Rad AI does:** In 5% of all reports, Rad AI Omni helps you catch and fix clinically significant errors in your findings dictation.

**What you build:** A post-polish LLM verification pass that checks for common clinical errors.

Add to `LLMPolisher` as a second pass:

```python
class ClinicalErrorChecker:
    """
    Runs AFTER the main polish step.
    Looks for clinically significant errors in the polished report.
    """

    async def check(self, polished_text: str, study_type: str) -> list[ClinicalFlag]:
        """
        LLM prompt:
        "Review this radiology report for clinically significant errors:

         1. LATERALITY: Does left/right usage make anatomical sense?
            Flag: 'right hippocampus' in a study that mentioned left-sided symptoms
         2. MEASUREMENT CONSISTENCY: Are measurements internally consistent?
            Flag: '2 cm nodule' in findings but '3 cm nodule' in impression
         3. MISSING ANATOMY: For this study type, are expected anatomical
            structures mentioned? A chest CT should address lungs, mediastinum,
            heart, bones. Flag anything completely omitted.
         4. CLINICAL INDICATION MISMATCH: Does the report address the
            clinical question? If ordered for 'rule out PE' but pulmonary
            arteries aren't mentioned, flag it.
         5. COMPARISON INCONSISTENCY: If comparison is mentioned, do the
            change descriptions make sense? 'Decreased' should mean smaller.
         6. GUIDELINE ADHERENCE: For findings with established guidelines
            (nodules, cysts, etc.), is the recommendation consistent?

         Return a list of flags with:
         - severity: 'critical' | 'warning' | 'info'
         - category: which check triggered
         - location: where in the report
         - message: what the issue is
         - suggestion: how to fix it

         Only flag genuine concerns. Do NOT flag stylistic preferences."
        """
        ...
```

In the editor, flags appear as inline annotations:
- Critical flags: red sidebar indicator, must be dismissed before signing
- Warning flags: amber underline, dismissible
- Info flags: subtle tooltip on hover

Track how often the radiologist accepts vs dismisses flags — this feeds back into tuning the error checker's sensitivity.

---

### Phase 9 build order (days 20-25): Clinical intelligence features

#### Phase 9a: Auto-impression + error checking (days 20-21)

1. Update LLM polish prompt with auto-impression generation rules
2. Add `style_examples` retrieval — pull 5-10 recent signed reports of same study type
3. Implement `[AI-GENERATED]` impression visual treatment in editor
4. Implement `ClinicalErrorChecker` as a second LLM pass
5. Add inline error flag rendering in editor (critical/warning/info)
6. Add flag accept/dismiss tracking for feedback
7. Test: dictate findings only, verify impression appears, verify error flags on intentional laterality mistake

#### Phase 9b: Follow-up tracking (days 22-23)

1. Create `processing/followup_extractor.py`
2. Add `follow_ups` table in Supabase
3. Wire extraction into the post-polish pipeline
4. Add `GET /training/followups` and `POST /training/followups/:id/complete` endpoints
5. Create `FollowUpTracker.tsx` component
6. Add weekly digest calculation
7. Test: dictate a report with "zalecana kontrolna TK za 3 miesiące", verify it appears in tracker

#### Phase 9c: Efficiency analytics + personal templates (days 24-25)

1. Create `training/efficiency_analyzer.py`
2. Add `GET /training/efficiency` endpoint
3. Create `EfficiencyInsights.tsx` component with actionable cards
4. Create `PersonalTemplateGenerator` class
5. Add "Generate personal template" button → calls LLM → saves to existing TemplateProvider
6. Implement `PriorReportMatcher` for follow-up pre-population
7. Add consensus guideline reference files in `prompts/guidelines/`
8. Update LLM prompt with guideline auto-insertion rules
9. Test: run efficiency analysis on accumulated reports, generate a personal chest X-ray template, test prior report matching on a follow-up study

---

## Updated file structure (complete)

```
dictation-server/
├── main.py
├── config.py
├── requirements.txt
├── Dockerfile
│
├── transcription/
│   ├── __init__.py
│   ├── engine.py                  # WhisperEngine with async lock
│   ├── streaming.py               # WebSocket handler
│   └── segment.py                 # POST handler
│
├── processing/
│   ├── __init__.py
│   ├── vad.py                     # Silero VAD
│   ├── domain_correction.py       # Radiology term fuzzy matcher
│   ├── llm_polish.py              # LLM cleanup
│   ├── hallucination_detector.py  # NEW — detect Whisper hallucinations
│   ├── audio_quality.py           # NEW — audio quality scoring
│   ├── audio_preprocess.py        # NEW — noise reduction, normalization
│   ├── followup_extractor.py      # NEW — extract follow-up recommendations
│   ├── clinical_error_checker.py  # NEW — post-polish error verification
│   ├── voice_commands.py          # FUTURE — voice command parser
│   └── template_detector.py       # FUTURE — auto-suggest template
│
├── training/
│   ├── __init__.py
│   ├── collector.py               # TrainingCollector
│   ├── storage.py                 # Disk + Supabase storage
│   ├── metrics.py                 # Maturity metrics
│   ├── efficiency_analyzer.py     # NEW — weekly dictation coaching
│   └── template_generator.py      # NEW — personal template generation
│
├── prompts/                       # NEW — versioned LLM prompts
│   ├── radiology_polish_v1.0.txt
│   ├── guidelines/                # NEW — consensus guideline references
│   │   ├── fleischner_2017.txt
│   │   ├── tirads.txt
│   │   ├── lirads.txt
│   │   ├── bosniak.txt
│   │   └── manifest.json
│   └── manifest.json
│
├── data/
│   ├── radiology_terms_en.json
│   ├── radiology_terms_pl.json
│   └── radiology_terms_de.json
│
└── tests/
    ├── test_transcription.py
    ├── test_domain_correction.py
    ├── test_hallucination.py      # NEW
    ├── test_audio_quality.py      # NEW
    └── test_audio/

mic-pwa/                           # NEW — phone microphone PWA
├── index.html                     # Single page: connect, volume meter
├── app.js                         # Audio capture + WebSocket streaming
├── encoder-worklet.js             # AudioWorklet for Opus encoding
├── manifest.json                  # PWA manifest
├── sw.js                          # Service worker
└── icons/
```

```
src/radiology/speaksync/
├── hooks/
│   ├── useSpeechRecognition.ts    # MODIFY — add parallel MediaRecorder for Path C training
│   ├── useServerTranscription.ts  # NEW — Path A + B, accepts audioSource prop
│   ├── useTranscriptionMode.ts    # NEW — mode switching
│   └── usePhoneMic.ts             # NEW — phone mic connection hook
├── services/
│   ├── transcriptionService.ts    # NEW — HTTP + WS + training client
│   └── phoneMicService.ts         # NEW — phone relay WebSocket client
├── components/
│   ├── TranscriptionModeSelector.tsx  # NEW — includes audio source selector
│   ├── ServerStatusIndicator.tsx      # NEW
│   ├── PhoneMicPairing.tsx            # NEW — QR code / room code pairing UI
│   ├── TrainingDashboard.tsx          # NEW — maturity metrics tab
│   ├── FollowUpTracker.tsx            # NEW — follow-up recommendation tracking
│   └── EfficiencyInsights.tsx         # NEW — weekly coaching cards
└── utils/
    └── audioSafetyBuffer.ts           # NEW — rolling 10s buffer
```
