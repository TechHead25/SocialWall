import os
import uuid
import shutil
import tempfile
import io
import json
import base64
import copy
from pathlib import Path
from urllib import request as urllib_request
from urllib import error as urllib_error

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from PIL import Image, ImageEnhance

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
VECTOR_DIR = BASE_DIR / "vector_store"
OUTPUT_DIR = BASE_DIR / "output"
AVATAR_DIR = OUTPUT_DIR / "avatars"
REEL_DIR = OUTPUT_DIR / "reels"
TMP_DIR = BASE_DIR / "tmp"

for d in [VECTOR_DIR, AVATAR_DIR, REEL_DIR, TMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)

load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

_raw_openai_key = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_KEY = (_raw_openai_key or "").strip().strip('"').strip("'")

_raw_gemini_key = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
GEMINI_API_KEY = (_raw_gemini_key or "").strip().strip('"').strip("'")
SD_MODEL_ID = os.getenv("SD_MODEL_ID", "runwayml/stable-diffusion-v1-5")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
PORT = int(os.getenv("AI_SERVICE_PORT", "8000"))
AVATAR_PROVIDER = os.getenv("AVATAR_PROVIDER", "gemini").lower()
GEMINI_AVATAR_MODEL = os.getenv("GEMINI_AVATAR_MODEL", "gemini-2.0-flash-exp")
AVATAR_STRICT_GEMINI = os.getenv("AVATAR_STRICT_GEMINI", "true").lower() == "true"
RAG_LLM_PROVIDER = os.getenv("RAG_LLM_PROVIDER", "auto").lower()
GEMINI_RAG_MODEL = os.getenv("GEMINI_RAG_MODEL", "gemini-1.5-flash-latest")
RAG_EMBEDDINGS_PROVIDER = os.getenv("RAG_EMBEDDINGS_PROVIDER", "local").lower()

GEMINI_MODEL_FALLBACKS = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest"
]

STYLE_PROMPTS = {
    "futuristic engineer": (
        "futuristic engineer portrait, sleek smart-fabric jacket, holographic interface reflections, "
        "technical confidence, blue neon studio"
    ),
    "space scientist": (
        "space scientist portrait, astronaut-inspired research suit, cosmic observatory backdrop, "
        "soft rim light, high-detail face"
    ),
    "cyberpunk innovator": (
        "cyberpunk innovator portrait, chrome accents, neon magenta and cyan glow, "
        "rain-soaked city bokeh, editorial tech aesthetic"
    )
}

app = Flask(__name__)

_embeddings = None
_vector_store = None
_chat_model = None
_whisper_model = None
_whisper_backend = None
_sd_pipeline = None
_ffmpeg_cmd = None


def _ensure_embeddings():
    global _embeddings
    if _embeddings is None:
        use_openai_embeddings = RAG_EMBEDDINGS_PROVIDER == "openai" and bool(OPENAI_API_KEY)

        if use_openai_embeddings:
            from langchain_openai import OpenAIEmbeddings

            _embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
        else:
            from langchain_community.embeddings import FakeEmbeddings

            _embeddings = FakeEmbeddings(size=1536)
    return _embeddings


def _ensure_chat_model():
    global _chat_model
    if not OPENAI_API_KEY:
        return None

    if _chat_model is None:
        from langchain_openai import ChatOpenAI

        _chat_model = ChatOpenAI(model="gpt-4o-mini", api_key=OPENAI_API_KEY, temperature=0.2)
    return _chat_model


def _rag_model_candidates():
    ordered = [
        GEMINI_RAG_MODEL,
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-2.0-flash"
    ]
    seen = set()
    result = []
    for model in ordered:
        if model and model not in seen:
            seen.add(model)
            result.append(model)
    return result


def _generate_text_with_gemini(prompt: str):
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY for Gemini RAG generation.")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 220
        }
    }

    last_error = None
    for model_name in _rag_model_candidates():
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:"
            f"generateContent?key={GEMINI_API_KEY}"
        )
        req = urllib_request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib_request.urlopen(req, timeout=60) as response:
                raw_data = response.read().decode("utf-8")
        except urllib_error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="ignore")
            if "API_KEY_INVALID" in details or "API key not valid" in details:
                raise RuntimeError("Invalid GEMINI_API_KEY for RAG generation.") from exc
            if "is not found for API version" in details or "is not supported for generateContent" in details:
                last_error = details[:220]
                continue
            last_error = details[:220]
            continue
        except Exception as exc:
            last_error = str(exc)
            continue

        body = json.loads(raw_data)
        for candidate in body.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                text = (part.get("text") or "").strip()
                if text:
                    return text

    raise RuntimeError(f"Gemini RAG generation failed. Last details: {last_error or 'No response text'}")


def _generate_rag_answer(question: str, context: str):
    prompt = (
        "You are Anveshana Guide. Answer briefly and clearly. "
        "If context is missing, say you are unsure.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}"
    )

    provider = RAG_LLM_PROVIDER
    if provider not in {"auto", "gemini", "openai"}:
        provider = "auto"

    if provider in {"auto", "gemini"} and GEMINI_API_KEY:
        try:
            return _generate_text_with_gemini(prompt)
        except Exception:
            if provider == "gemini":
                raise

    if provider in {"auto", "openai"}:
        try:
            model = _ensure_chat_model()
            if model is not None:
                return model.invoke(prompt).content
        except Exception:
            pass

    snippets = [part.strip() for part in context.split("\n") if part.strip()]
    return " ".join(snippets[:2])[:280] or "I am unsure based on current event knowledge."


def _load_documents():
    from langchain_community.document_loaders import TextLoader, CSVLoader, PyPDFLoader

    docs = []
    if not DATA_DIR.exists():
        return docs

    for file_path in DATA_DIR.glob("*"):
        suffix = file_path.suffix.lower()
        if suffix == ".txt":
            docs.extend(TextLoader(str(file_path), encoding="utf-8").load())
        elif suffix == ".csv":
            docs.extend(CSVLoader(str(file_path)).load())
        elif suffix == ".pdf":
            docs.extend(PyPDFLoader(str(file_path)).load())

    return docs


def build_faiss_index():
    global _vector_store
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS

    documents = _load_documents()
    if not documents:
        raise ValueError("No documents found in /data folder for indexing")

    splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120)
    chunks = splitter.split_documents(documents)

    # AI pipeline: OpenAI embeddings -> FAISS vector index persisted on disk.
    _vector_store = FAISS.from_documents(chunks, _ensure_embeddings())
    _vector_store.save_local(str(VECTOR_DIR))

    return {
        "documents": len(documents),
        "chunks": len(chunks),
        "vectorPath": str(VECTOR_DIR)
    }


def load_or_create_index():
    global _vector_store
    from langchain_community.vectorstores import FAISS

    if _vector_store is not None:
        return _vector_store

    if (VECTOR_DIR / "index.faiss").exists():
        _vector_store = FAISS.load_local(
            str(VECTOR_DIR),
            _ensure_embeddings(),
            allow_dangerous_deserialization=True
        )
        return _vector_store

    build_faiss_index()
    return _vector_store


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "anveshana-ai-service"})


@app.route("/generated/<path:filename>")
def generated_files(filename):
    return send_from_directory(str(OUTPUT_DIR), filename)


@app.post("/rag/reindex")
def rag_reindex():
    try:
        result = build_faiss_index()
        return jsonify({"message": "FAISS index rebuilt", **result})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/rag/query")
def rag_query():
    try:
        payload = request.get_json(silent=True) or {}
        question = (payload.get("question") or "").strip()
        if not question:
            return jsonify({"error": "question is required"}), 400

        vector_store = load_or_create_index()
        matches = vector_store.similarity_search(question, k=4)
        context = "\n\n".join(doc.page_content for doc in matches)

        # AI pipeline: retrieve relevant context from FAISS then ask configured LLM provider.
        answer = _generate_rag_answer(question, context)

        return jsonify({
            "answer": answer,
            "sources": [
                (doc.metadata.get("source") or "unknown")
                for doc in matches
            ]
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


def _ensure_sd_pipeline():
    global _sd_pipeline
    if _sd_pipeline is not None:
        return _sd_pipeline

    try:
        from diffusers import StableDiffusionImg2ImgPipeline
        import torch

        _sd_pipeline = StableDiffusionImg2ImgPipeline.from_pretrained(
            SD_MODEL_ID,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            safety_checker=None
        )
        if torch.cuda.is_available():
            _sd_pipeline = _sd_pipeline.to("cuda")
        return _sd_pipeline
    except Exception:
        return None


def _fallback_avatar(image: Image.Image):
    img = image.convert("RGB")
    img = ImageEnhance.Color(img).enhance(1.8)
    img = ImageEnhance.Contrast(img).enhance(1.4)
    return img


def _style_prompt(style: str):
    return STYLE_PROMPTS.get(style, STYLE_PROMPTS["futuristic engineer"])


def _avatar_model_candidates():
    ordered = [GEMINI_AVATAR_MODEL, *GEMINI_MODEL_FALLBACKS]
    seen = set()
    result = []
    for model in ordered:
        if model and model not in seen:
            seen.add(model)
            result.append(model)
    return result


def _generate_avatar_with_gemini(base_image: Image.Image, style: str, intensity: float):
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "Missing GEMINI_API_KEY. Add a valid key in ai-services/.env and restart the AI service."
        )

    buffer = io.BytesIO()
    base_image.save(buffer, format="PNG")
    image_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    prompt = (
        "Transform this selfie into a clearly stylized premium AI event portrait with a nano banana studio look. "
        f"Theme: {style}. Style directive: {_style_prompt(style)}. "
        f"Transformation intensity: {intensity:.2f}. "
        "Preserve identity and facial geometry while changing outfit/background/lighting to match the style. "
        "Cinematic contrast, neon edge lights, high detail, conference-grade portrait, no text or watermark."
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": image_b64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.6,
            "responseModalities": ["IMAGE"]
        }
    }

    payload_variants = [
        payload,
        {
            **copy.deepcopy(payload),
            "generationConfig": {
                "temperature": 0.6
            }
        }
    ]

    last_error = None
    for model_name in _avatar_model_candidates():
        for payload_variant in payload_variants:
            endpoint = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:"
                f"generateContent?key={GEMINI_API_KEY}"
            )
            req = urllib_request.Request(
                endpoint,
                data=json.dumps(payload_variant).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            raw_data = None
            for attempt in range(2):
                try:
                    with urllib_request.urlopen(req, timeout=120) as response:
                        raw_data = response.read().decode("utf-8")
                    break
                except urllib_error.URLError as exc:
                    if attempt == 1:
                        last_error = f"Network error while calling Gemini: {exc}"
                    continue
                except ConnectionResetError as exc:
                    if attempt == 1:
                        last_error = f"Connection reset while calling Gemini: {exc}"
                    continue
                except urllib_error.HTTPError as exc:
                    details = exc.read().decode("utf-8", errors="ignore")
                    if "API_KEY_INVALID" in details or "API key not valid" in details:
                        raise RuntimeError(
                            "Invalid GEMINI_API_KEY. Use a Google AI Studio key with Generative Language API enabled, "
                            "and remove HTTP referrer restrictions for this server-side call."
                        ) from exc
                    if (
                        "is not found for API version" in details
                        or "is not supported for generateContent" in details
                        or "Model does not support the requested response modalities" in details
                    ):
                        last_error = details[:260]
                        raw_data = None
                        break
                    raise RuntimeError(f"Gemini avatar request failed: {details[:260]}") from exc

            if not raw_data:
                continue

            body = json.loads(raw_data)
            candidates = body.get("candidates", [])
            for candidate in candidates:
                for part in candidate.get("content", {}).get("parts", []):
                    inline_data = part.get("inlineData") or part.get("inline_data")
                    if inline_data and inline_data.get("data"):
                        image_bytes = base64.b64decode(inline_data["data"])
                        return Image.open(io.BytesIO(image_bytes)).convert("RGB"), model_name

            last_error = "Gemini response had no image parts"

    raise RuntimeError(
        "Gemini avatar generation could not find a compatible model for generateContent image output. "
        f"Last details: {last_error or 'No model response'}"
    )


@app.post("/avatar/generate")
def avatar_generate():
    try:
        if "photo" not in request.files:
            return jsonify({"error": "photo file is required"}), 400

        style = request.form.get("style", "futuristic engineer")
        provider_preference = (request.form.get("providerPreference") or "auto").lower().strip()
        intensity_raw = request.form.get("intensity") or "0.72"
        try:
            intensity = float(intensity_raw)
        except ValueError:
            intensity = 0.72
        intensity = max(0.35, min(0.95, intensity))

        if provider_preference not in {"auto", "gemini", "diffusers"}:
            return jsonify({"error": "Invalid providerPreference"}), 400
        photo = request.files["photo"]
        temp_path = TMP_DIR / f"{uuid.uuid4()}-{photo.filename}"
        photo.save(temp_path)

        base_image = Image.open(temp_path).convert("RGB").resize((768, 768))

        # AI pipeline: style prompt + Gemini image generation or Diffusers img2img.
        prompt = (
            f"portrait of a {style}, {_style_prompt(style)}, cinematic, tech conference aesthetic, "
            "sharp details, professional retouched lighting"
        )

        output_image = None
        provider_used = "fallback"
        gemini_error = None

        use_gemini = provider_preference == "gemini" or (provider_preference == "auto" and AVATAR_PROVIDER == "gemini")

        if use_gemini:
            try:
                output_image, used_model = _generate_avatar_with_gemini(base_image, style, intensity)
                if output_image is not None:
                    provider_used = f"gemini:{used_model}"
            except Exception as exc:
                gemini_error = str(exc)
                output_image = None

            if output_image is None and AVATAR_STRICT_GEMINI:
                raise RuntimeError(
                    "Gemini avatar generation failed in strict mode. "
                    f"Details: {gemini_error or 'No image output'}"
                )

        if output_image is None:
            pipe = _ensure_sd_pipeline()
            if pipe is not None:
                guidance = 7.0 + (intensity * 2.0)
                result = pipe(
                    prompt=prompt,
                    image=base_image,
                    strength=intensity,
                    guidance_scale=guidance,
                    num_inference_steps=40
                )
                output_image = result.images[0]
                provider_used = "diffusers"
            else:
                output_image = _fallback_avatar(base_image)
                provider_used = "fallback"

        file_name = f"avatar-{uuid.uuid4()}.png"
        output_path = AVATAR_DIR / file_name
        output_image.save(output_path)

        temp_path.unlink(missing_ok=True)

        file_url = f"{request.host_url.rstrip('/')}/generated/avatars/{file_name}"
        return jsonify({
            "style": style,
            "imageUrl": file_url,
            "provider": provider_used,
            "intensity": intensity
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


def _ensure_whisper_model():
    global _whisper_model, _whisper_backend
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel

            _whisper_model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
            _whisper_backend = "faster-whisper"
        except ModuleNotFoundError:
            try:
                ffmpeg_cmd = _resolve_ffmpeg_cmd()
                if not ffmpeg_cmd:
                    raise RuntimeError("No ffmpeg binary available for openai-whisper")

                import whisper

                _whisper_model = whisper.load_model(WHISPER_MODEL)
                _whisper_backend = "openai-whisper"
            except Exception as exc:
                raise RuntimeError(
                    "Whisper backend unavailable. Install `faster-whisper` or provide ffmpeg in PATH "
                    "for openai-whisper."
                ) from exc
    return _whisper_model, _whisper_backend


def _resolve_ffmpeg_cmd():
    global _ffmpeg_cmd
    if _ffmpeg_cmd:
        return _ffmpeg_cmd

    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        _ffmpeg_cmd = system_ffmpeg
        return _ffmpeg_cmd

    try:
        import imageio_ffmpeg

        _ffmpeg_cmd = imageio_ffmpeg.get_ffmpeg_exe()
        return _ffmpeg_cmd
    except Exception as exc:
        raise RuntimeError(
            "FFmpeg binary not found. Install FFmpeg in PATH or run `pip install imageio-ffmpeg` "
            "in ai-services environment."
        ) from exc


def _transcribe_video(input_path):
    model, backend = _ensure_whisper_model()

    if backend == "openai-whisper":
        return model.transcribe(str(input_path))

    segments_iter, info = model.transcribe(str(input_path), beam_size=5)
    segments = []
    full_text_parts = []
    for seg in segments_iter:
        text = (seg.text or "").strip()
        segments.append({
            "start": float(seg.start),
            "end": float(seg.end),
            "text": text
        })
        if text:
            full_text_parts.append(text)

    return {
        "text": " ".join(full_text_parts),
        "segments": segments,
        "language": getattr(info, "language", None)
    }


def _pick_highlight_segments(segments):
    scored = []
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if len(text.split()) < 5:
            continue

        duration = max(1.0, float(seg.get("end", 0)) - float(seg.get("start", 0)))
        keyword_bonus = 0
        lowered = text.lower()
        for kw in ["innovation", "ai", "future", "engineering", "launch", "breakthrough"]:
            if kw in lowered:
                keyword_bonus += 3

        score = min(len(text), 180) / 20 + keyword_bonus + duration / 5
        scored.append((score, seg))

    scored.sort(key=lambda item: item[0], reverse=True)
    best = [seg for _, seg in scored[:3]]

    if not best and segments:
        best = segments[:3]

    return best


def _cut_clips(video_path, segments):
    import ffmpeg

    ffmpeg_cmd = _resolve_ffmpeg_cmd()

    clips = []
    for idx, seg in enumerate(segments, start=1):
        start = max(0, float(seg.get("start", 0)))
        end = float(seg.get("end", start + 10))
        duration = max(6, min(10, end - start))

        clip_path = REEL_DIR / f"clip-{uuid.uuid4()}-{idx}.mp4"
        (
            ffmpeg
            .input(str(video_path), ss=start, t=duration)
            .output(str(clip_path), vcodec="libx264", acodec="aac", preset="veryfast")
            .overwrite_output()
            .run(cmd=ffmpeg_cmd, quiet=True)
        )
        clips.append(str(clip_path))

    return clips


def _concat_clips(clips):
    import ffmpeg

    ffmpeg_cmd = _resolve_ffmpeg_cmd()

    if not clips:
        return None

    list_file = TMP_DIR / f"concat-{uuid.uuid4()}.txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for clip in clips:
            normalized_clip = clip.replace("\\", "/")
            f.write(f"file '{normalized_clip}'\n")

    output_path = REEL_DIR / f"reel-{uuid.uuid4()}.mp4"
    (
        ffmpeg
        .input(str(list_file), format="concat", safe=0)
        .output(str(output_path), c="copy")
        .overwrite_output()
        .run(cmd=ffmpeg_cmd, quiet=True)
    )

    list_file.unlink(missing_ok=True)
    return output_path


@app.post("/highlights/generate")
def highlights_generate():
    video = request.files.get("video")
    if not video:
        return jsonify({"error": "video file is required"}), 400

    temp_dir = Path(tempfile.mkdtemp(prefix="anveshana-", dir=str(TMP_DIR)))
    try:
        input_path = temp_dir / video.filename
        video.save(input_path)

        # AI pipeline: Whisper transcription -> sentence ranking -> FFmpeg clip extraction.
        transcript_result = _transcribe_video(input_path)
        segments = transcript_result.get("segments", [])

        picked = _pick_highlight_segments(segments)
        clips = _cut_clips(input_path, picked)
        reel_path = _concat_clips(clips)

        highlights = [seg.get("text", "").strip() for seg in picked]
        if reel_path is None:
            return jsonify({"error": "Unable to generate clips"}), 500

        reel_url = f"{request.host_url.rstrip('/')}/generated/reels/{reel_path.name}"
        return jsonify({
            "reelUrl": reel_url,
            "highlights": highlights,
            "transcript": transcript_result.get("text", "")
        })
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
