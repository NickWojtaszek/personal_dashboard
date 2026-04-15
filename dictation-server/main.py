"""
Radiology dictation server — MVP1.

Single-endpoint POST /transcribe that takes audio + language, returns
Whisper-transcribed text optionally passed through a domain-specific
correction dictionary.

No streaming, no LLM polish, no training data collection. The client
(React app) handles polish via its existing AIReportRefinementModal.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, Tuple, List, Dict

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rapidfuzz import fuzz, process

from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("dictation")

# Resolve data directory regardless of where the server is launched from
DATA_DIR = Path(__file__).resolve().parent / "data"


# ─── Whisper engine ──────────────────────────────────────────────────

class WhisperEngine:
    """
    Wraps faster-whisper. The underlying model is not thread-safe, so
    we serialise transcription via an asyncio.Lock. For solo-use this
    is fine; for multi-user deployments, run multiple server instances
    behind a load balancer.
    """

    def __init__(self) -> None:
        self.model = None
        self.lock = asyncio.Lock()
        self.model_name = settings.whisper_model
        self.device = settings.whisper_device

    def load(self, model_name: Optional[str] = None) -> None:
        # Imported lazily so `python -c "import config"` works without faster-whisper
        from faster_whisper import WhisperModel

        name = model_name or settings.whisper_model
        log.info(
            "Loading Whisper model=%s device=%s compute=%s (first load of a new model downloads ~140MB+)",
            name, settings.whisper_device, settings.whisper_compute_type,
        )
        t0 = time.perf_counter()
        self.model = WhisperModel(
            name,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        self.model_name = name
        log.info("Model loaded in %.1fs", time.perf_counter() - t0)

    async def reload(self, model_name: str) -> None:
        """Swap to a different model. Queues behind any in-flight transcription."""
        async with self.lock:
            # Drop references to the old model so ctranslate2 releases its memory
            self.model = None
            await asyncio.to_thread(self.load, model_name)

    async def transcribe(self, audio_path: str, language: str) -> Tuple[str, float, str, float]:
        """Returns (text, avg_confidence, language_detected, duration_sec)."""
        if self.model is None:
            raise RuntimeError("Whisper model not loaded")

        async with self.lock:
            return await asyncio.to_thread(self._transcribe_sync, audio_path, language)

    def _transcribe_sync(self, audio_path: str, language: str) -> Tuple[str, float, str, float]:
        # `language=None` lets Whisper auto-detect
        lang_arg: Optional[str] = language if language and language != "auto" else None
        segments, info = self.model.transcribe(
            audio_path,
            language=lang_arg,
            beam_size=settings.whisper_beam_size,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )
        text_parts: List[str] = []
        logprobs: List[float] = []
        for seg in segments:
            text_parts.append(seg.text)
            if seg.avg_logprob is not None:
                logprobs.append(seg.avg_logprob)

        text = " ".join(p.strip() for p in text_parts if p and p.strip()).strip()
        # Convert avg_logprob (negative) to a 0–1 confidence
        # logprob 0 = perfect, -1 = poor; clamp
        avg_logprob = sum(logprobs) / len(logprobs) if logprobs else -1.0
        confidence = max(0.0, min(1.0, 1.0 + avg_logprob))
        return text, confidence, info.language, float(info.duration)


# ─── Domain corrector ────────────────────────────────────────────────

class DomainCorrector:
    """
    Three-pass correction:
      1. Exact misheard-phrase replacements (radiology_terms.terms)
      2. Number patterns ("two centimeter" -> "2 cm")
      3. Abbreviations ("centimeter" -> "cm")
      4. Optional fuzzy match for any remaining word matching a canonical term
    """

    def __init__(self) -> None:
        self.dictionaries: Dict[str, dict] = {}

    def load_for(self, language: str) -> dict:
        if language not in self.dictionaries:
            path = DATA_DIR / f"radiology_terms_{language}.json"
            if path.exists():
                with path.open(encoding="utf-8") as f:
                    self.dictionaries[language] = json.load(f)
            else:
                log.warning("No dictionary for language=%s — skipping correction", language)
                self.dictionaries[language] = {"terms": {}, "abbreviations": {}, "number_patterns": {}}
        return self.dictionaries[language]

    def correct(self, text: str, language: str) -> Tuple[str, List[Dict[str, str]]]:
        if not text:
            return text, []

        dictionary = self.load_for(language)
        corrections: List[Dict[str, str]] = []
        result = text

        # Pass 1: number patterns FIRST (before single-word replacements destroy them)
        for pattern, replacement in dictionary.get("number_patterns", {}).items():
            new_result = re.sub(rf"\b{re.escape(pattern)}\b", replacement, result, flags=re.IGNORECASE)
            if new_result != result:
                corrections.append({"from": pattern, "to": replacement, "type": "number"})
                result = new_result

        # Pass 2: exact misheard variants
        for canonical, variants in dictionary.get("terms", {}).items():
            for variant in variants:
                pattern = rf"\b{re.escape(variant)}\b"
                new_result = re.sub(pattern, canonical, result, flags=re.IGNORECASE)
                if new_result != result:
                    corrections.append({"from": variant, "to": canonical, "type": "exact"})
                    result = new_result

        # Pass 3: abbreviations
        for full_word, abbr in dictionary.get("abbreviations", {}).items():
            new_result = re.sub(rf"\b{re.escape(full_word)}\b", abbr, result, flags=re.IGNORECASE)
            if new_result != result:
                corrections.append({"from": full_word, "to": abbr, "type": "abbreviation"})
                result = new_result

        # Pass 4: fuzzy match for remaining words against canonical terms
        canonical_terms = list(dictionary.get("terms", {}).keys())
        if canonical_terms:
            words = result.split()
            changed = False
            for i, word in enumerate(words):
                # Skip short words and words that already exactly match a canonical term
                if len(word) < 5 or word.lower() in (t.lower() for t in canonical_terms):
                    continue
                # Strip trailing punctuation for matching
                stripped = re.sub(r"[^\w]+$", "", word)
                if len(stripped) < 5:
                    continue
                match = process.extractOne(stripped, canonical_terms, scorer=fuzz.ratio, score_cutoff=88)
                if match:
                    canonical, score, _ = match
                    # Preserve trailing punctuation
                    suffix = word[len(stripped):]
                    new_word = canonical + suffix
                    if new_word != word:
                        corrections.append({"from": word, "to": new_word, "type": f"fuzzy({int(score)})"})
                        words[i] = new_word
                        changed = True
            if changed:
                result = " ".join(words)

        return result, corrections


# ─── App lifespan ────────────────────────────────────────────────────

engine = WhisperEngine()
corrector = DomainCorrector()


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.load()
    yield


app = FastAPI(title="Radiology Dictation Server", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ─── Endpoints ───────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    languages_loaded: List[str]


class Correction(BaseModel):
    from_: str
    to: str
    type: str

    class Config:
        # Allow alias for the reserved word "from"
        populate_by_name = True


class TranscribeResponse(BaseModel):
    raw_text: str
    corrected_text: str
    corrections_applied: List[Dict[str, str]]
    confidence: float
    language_detected: str
    duration_sec: float
    processing_ms: int


AVAILABLE_MODELS: List[str] = [
    "tiny", "tiny.en",
    "base", "base.en",
    "small", "small.en",
    "medium", "medium.en",
    "large-v2", "large-v3",
    "large-v3-turbo",
    "distil-large-v3",
]


class ModelsResponse(BaseModel):
    available: List[str]
    current: str


class ReloadRequest(BaseModel):
    model: str


@app.get("/models", response_model=ModelsResponse)
async def list_models() -> ModelsResponse:
    return ModelsResponse(available=AVAILABLE_MODELS, current=engine.model_name)


MODEL_MIN_FREE_RAM_MB = {
    "tiny": 400,
    "tiny.en": 400,
    "base": 600,
    "base.en": 600,
    "small": 1200,
    "small.en": 1200,
    "medium": 3000,
    "medium.en": 3000,
    "large-v2": 5500,
    "large-v3": 5500,
    "large-v3-turbo": 2500,
    "distil-large-v3": 2000,
}


def _available_ram_mb() -> Optional[int]:
    """Best-effort free-RAM probe. Returns None if we can't measure."""
    try:
        import psutil
        return int(psutil.virtual_memory().available / (1024 * 1024))
    except ImportError:
        pass
    try:
        # Linux-only fallback
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemAvailable:"):
                    kb = int(line.split()[1])
                    return kb // 1024
    except (OSError, ValueError):
        pass
    return None


@app.post("/model", response_model=ModelsResponse)
async def set_model(req: ReloadRequest) -> ModelsResponse:
    if req.model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model '{req.model}'. Available: {', '.join(AVAILABLE_MODELS)}")
    if req.model == engine.model_name:
        return ModelsResponse(available=AVAILABLE_MODELS, current=engine.model_name)

    # Preflight memory check: refuse models that definitely won't fit.
    required_mb = MODEL_MIN_FREE_RAM_MB.get(req.model)
    available_mb = _available_ram_mb()
    if required_mb and available_mb is not None and available_mb < required_mb:
        raise HTTPException(
            status_code=507,  # Insufficient Storage
            detail=(
                f"Not enough free RAM for '{req.model}': needs ~{required_mb} MB, only {available_mb} MB free. "
                f"Close other apps or pick a smaller model."
            ),
        )

    try:
        await engine.reload(req.model)
    except MemoryError as e:
        log.exception("Model reload failed (OOM)")
        # Try to recover to the previous model so the server stays usable
        try:
            await engine.reload(settings.whisper_model)
        except Exception:
            pass
        raise HTTPException(
            status_code=507,
            detail=f"'{req.model}' ran out of memory during load. Falling back to '{engine.model_name}'.",
        )
    except Exception as e:
        log.exception("Model reload failed")
        raise HTTPException(status_code=500, detail=f"Model reload failed: {e}")
    return ModelsResponse(available=AVAILABLE_MODELS, current=engine.model_name)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    available = []
    for lang in ("en", "pl", "de"):
        if (DATA_DIR / f"radiology_terms_{lang}.json").exists():
            available.append(lang)
    return HealthResponse(
        status="ok" if engine.model is not None else "loading",
        model=engine.model_name,
        device=engine.device,
        languages_loaded=available,
    )


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default=settings.default_language),
    correct: bool = Form(default=True),
) -> TranscribeResponse:
    started = time.perf_counter()

    # Reject obviously oversized uploads
    raw = await audio.read()
    size_mb = len(raw) / (1024 * 1024)
    if size_mb > settings.max_audio_size_mb:
        raise HTTPException(status_code=413, detail=f"Audio file too large ({size_mb:.1f}MB > {settings.max_audio_size_mb}MB)")

    # Whisper requires a file path. Use a cross-platform temp file.
    suffix = _suffix_for(audio.filename, audio.content_type)
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_path = tmp.name
    try:
        tmp.write(raw)
        tmp.close()

        try:
            text, confidence, lang_detected, duration = await engine.transcribe(tmp_path, language)
        except (MemoryError, RuntimeError) as e:
            # Includes mkl_malloc allocation failures and ctranslate2 OOM
            msg = str(e)
            log.exception("Transcription failed (likely OOM)")
            if "malloc" in msg.lower() or "memory" in msg.lower():
                raise HTTPException(
                    status_code=507,
                    detail=(
                        f"'{engine.model_name}' ran out of memory mid-transcription. "
                        f"Switch to a smaller model (small or base) and try again."
                    ),
                )
            raise HTTPException(status_code=500, detail=f"Transcription failed: {msg}")
        except Exception as e:
            log.exception("Transcription failed")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

        if correct and text:
            corrected, corrections = corrector.correct(text, language)
        else:
            corrected, corrections = text, []

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        log.info(
            "Transcribed %.1fs of audio in %dms (lang=%s conf=%.2f corrections=%d)",
            duration, elapsed_ms, lang_detected, confidence, len(corrections),
        )

        return TranscribeResponse(
            raw_text=text,
            corrected_text=corrected,
            corrections_applied=corrections,
            confidence=confidence,
            language_detected=lang_detected,
            duration_sec=duration,
            processing_ms=elapsed_ms,
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _suffix_for(filename: Optional[str], content_type: Optional[str]) -> str:
    if filename:
        ext = os.path.splitext(filename)[1]
        if ext:
            return ext
    if content_type:
        ct = content_type.lower()
        if "webm" in ct:
            return ".webm"
        if "mp4" in ct or "m4a" in ct or "aac" in ct:
            return ".mp4"
        if "wav" in ct:
            return ".wav"
        if "ogg" in ct:
            return ".ogg"
    return ".bin"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
