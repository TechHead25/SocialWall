# Anveshana AI Event Platform

Production-ready local platform for AI-powered event experiences:

1. WhatsApp RAG Chatbot (Anveshana Guide)
2. AI Photo Booth (Engineer Avatar generator)
3. Social Media Live Wall
4. Auto Highlights Reel Generator

## Tech Stack

- Frontend: React + Vite + TailwindCSS
- Backend: Node.js + Express + Multer + REST APIs
- AI Services (Python): LangChain + FAISS + OpenAI + Diffusers + Whisper + FFmpeg
- Storage: JSON files (`backend/storage`)
- Knowledge Base: `data/` (PDF/TXT/CSV)

## Project Structure

/anveshana-ai-platform
- frontend/
- backend/
- ai-services/
- data/
- package.json
- README.md

## 1) Install and Run (Node services)

```bash
npm install
npm run dev
```

This starts:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

## 2) Install and Run Python AI Service

```bash
cd ai-services
pip install -r requirements.txt
python app.py
```

AI Service runs on:
- `http://localhost:8000`

## Deploy Backend on Render

This repo includes a `render.yaml` blueprint for backend deploy.

1. Push this repo to GitHub.
2. In Render, choose **New +** -> **Blueprint** and connect the repository.
3. Select the `anveshana-backend` service and deploy.
4. In Render service environment variables, set:
	- `GEMINI_API_KEY`
	- `AI_SERVICE_URL` (public URL of your Python AI service)
	- `WHATSAPP_BOT_NAME` (optional)
	- `WHATSAPP_REPLY_MAX_CHARS` (optional)
5. Health check path is `/api/health`.

Notes:
- Render sets `PORT` automatically (already supported in backend config).
- If you don't deploy the Python AI service, chatbot/photo/highlights endpoints that call AI will fail.

## Environment Setup

Copy these templates and fill values:

- Root: `.env.example`
- Backend: `backend/.env.example`
- Frontend: `frontend/.env.example`
- Python AI: `ai-services/.env.example`

Required key:
- `GEMINI_API_KEY`

Also ensure `ffmpeg` is installed and available in PATH.

## API Endpoints

### Chatbot (RAG)
- `POST /api/chatbot/query`
- `POST /api/chatbot/knowledge` (multipart files)
- `POST /api/chatbot/reindex`

### WhatsApp RAG Bot
- `POST /api/whatsapp/webhook`
- `GET /api/whatsapp/health`

### AI Photo Booth
- `GET /api/photo-booth/styles`
- `POST /api/photo-booth/avatar` (multipart: `photo`, `style`)

Supported styles:
- futuristic engineer
- space scientist
- cyberpunk innovator

### Social Wall
- `POST /api/social-wall/posts` (multipart: `image`, `caption`)
- `GET /api/social-wall/posts?status=approved|pending|rejected|all`
- `PATCH /api/social-wall/posts/:id/moderate`
- `GET /api/social-wall/analytics`

### Auto Highlights
- `POST /api/highlights/upload` (multipart: `video`)
- `GET /api/highlights/jobs`

## UI Pages

Public:
- `/` Social Wall Screen
- `/photo-booth` Photo Booth Capture Page

Admin:
- `/anveshana-control-room/knowledge` Upload Knowledge
- `/anveshana-control-room/video` Upload Video
- `/anveshana-control-room/moderate` Moderate Posts
- `/anveshana-control-room/analytics` View Analytics

## AI Pipeline Notes

- **RAG**: Loads docs from `data/` -> chunks with LangChain -> embeddings -> FAISS index -> concise answer generation.
- **Photo Booth**: Upload image -> style prompt -> Stable Diffusion Img2Img (diffusers) -> generated avatar image.
- **Social Wall moderation**: Caption evaluated via OpenAI moderation endpoint before admin flow.
- **Highlights**: Whisper transcription -> sentence ranking -> FFmpeg clip extraction/concat -> highlight reel.

## Local Demo Flow

1. Open admin knowledge page and upload sample docs.
2. Use photo booth page to generate avatar.
3. Submit social posts and approve from moderation page.
4. Upload an event video to generate highlights reel.

## WhatsApp RAG Bot Setup (Twilio Sandbox)

1. Start backend and AI service.
2. Expose local backend via ngrok (or Cloudflare tunnel), e.g. `https://<public-url>`.
3. In Twilio WhatsApp Sandbox settings:
	- Incoming message webhook URL: `https://<public-url>/api/whatsapp/webhook`
	- Method: `POST`
4. Join the sandbox from your WhatsApp as instructed by Twilio.
5. Send any question; the webhook will call RAG and return answer as TwiML message.

Optional backend env:
- `WHATSAPP_BOT_NAME` for response prefix/help text
- `WHATSAPP_REPLY_MAX_CHARS` to cap response length for chat readability

## Photo Booth Quality Mode

- Default avatar provider is Gemini image generation (`AVATAR_PROVIDER=gemini`) with model from `GEMINI_AVATAR_MODEL`.
- If Gemini image output is unavailable, service falls back to Diffusers and then local enhancement fallback.
