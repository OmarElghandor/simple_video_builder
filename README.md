# AI Lesson Video Generator (Demo)

A standalone proof-of-concept that turns a text topic into a narrated teaching video:

1. Claude generates a JSON lesson script (3–5 minutes, multiple scenes)
2. ElevenLabs generates narration audio per scene
3. Remotion renders a single MP4 with centered captions over a plain background

No database, no auth, no job queue — one text box in, one video out.

## Prerequisites

- **Node.js** 18+
- **FFmpeg** installed and available on your `PATH` ([install guide](https://ffmpeg.org/download.html))
- API keys for **Anthropic (Claude)** and **ElevenLabs**

On first render, Remotion may download Chromium automatically. This can take a few minutes.

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:

- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID` — pick a voice from your ElevenLabs account

```bash
npm install
npm run dev
```

The backend runs at `http://localhost:3001`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Usage

1. Type a topic or instruction (e.g. *"Teach ordering coffee in English for an Arabic-speaking beginner"*).
2. Click **Generate Video**.
3. Wait while the backend generates the script, narration, and video synchronously. This can take several minutes.
4. Watch the finished MP4 in the page when it completes.

## Project structure

```
simple-vid-generate/
├── backend/     Express + Remotion + Claude + ElevenLabs
└── frontend/    Vite + React single-page UI
```

Generated files are stored locally:

- `backend/output/audio/{requestId}/` — scene MP3 files
- `backend/output/videos/` — rendered MP4 files
- `backend/public/audio/{requestId}/` — audio copies used by Remotion

## API

### `POST /api/generate`

Request:

```json
{ "prompt": "Teach basic greetings in English and Arabic" }
```

Success response:

```json
{
  "videoUrl": "/output/videos/{requestId}.mp4",
  "title": "Basic Greetings",
  "sceneCount": 10
}
```

Error response:

```json
{ "error": "Human-readable error message" }
```

### `GET /api/health`

Returns `{ "ok": true }`.

## Notes

- Processing is fully synchronous: the HTTP request stays open until rendering finishes.
- Every scene uses the same Remotion template (caption + plain background + audio).
- This demo is intentionally separate from any Langify codebase.

### Render smoke test (no API keys)

To verify Remotion rendering without Claude or ElevenLabs:

```bash
cd backend
npm run smoke-test
```

This generates a short test MP4 at `backend/output/videos/smoke-test.mp4`.

## Deploying to Railway

The app ships as a single Docker container: the Express backend serves the built React UI as static files, and Remotion renders videos inside the same service.

### Setup

1. Create a new Railway project and connect this repository.
2. **Important:** Railway deploys from your git repository. The `Dockerfile`, `railway.toml`, and all app code must be committed and pushed — if only `README.md` is on the remote branch, Railway will fall back to Railpack and the build will fail.
3. In the Railway service **Settings → Build**, confirm **Root Directory** is empty (repo root) and the builder is **Dockerfile**.
4. Railway reads `railway.toml` / `railway.json`, which point the build at the root `Dockerfile`.
5. In the Railway service **Variables** tab, set:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude script generation |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for narration |
| `ELEVENLABS_VOICE_ID` | Yes | Voice ID from your ElevenLabs account |
| `CLOUDINARY_URL` | Recommended | Single connection URL from Cloudinary dashboard, e.g. `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` |

Alternatively, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` separately.

Optional variables (same as local `.env`): `CLAUDE_MODEL`, `ELEVENLABS_MODEL`.

Railway injects `PORT` automatically — do not set it manually.

### Video storage (Cloudinary)

When `CLOUDINARY_URL` (or all three separate `CLOUDINARY_*` variables) is set, finished MP4s are uploaded to Cloudinary after rendering and served from a permanent HTTPS URL.

Without Cloudinary, videos are stored locally in `backend/output/videos/` inside the container. **That local storage is ephemeral on Railway** and will be empty after a redeploy.

Get your Cloudinary credentials from the [Cloudinary Console](https://console.cloudinary.com/) → Dashboard.

### Memory and CPU

Remotion rendering with headless Chromium is memory- and CPU-intensive. Railway's default service resources may not be enough for a full multi-minute lesson video. After your first real render attempt on the deployed service, check CPU and memory usage in Railway's metrics and increase limits in **Settings → Resources** if renders fail or time out.

### Verify the Docker image locally

```bash
docker build -t lesson-video .

# Optional: confirm Remotion can render inside the built image
docker run --rm lesson-video npm run smoke-test

# Run the full app
docker run --rm -p 3001:3001 \
  -e PORT=3001 \
  -e ANTHROPIC_API_KEY=... \
  -e ELEVENLABS_API_KEY=... \
  -e ELEVENLABS_VOICE_ID=... \
  lesson-video
```

Open `http://localhost:3001` to use the full app.

The Docker build installs and verifies the headless Chromium binary but does **not** run a full render during build — that step is too memory-heavy for many CI environments (including Railway). Run `npm run smoke-test` in a container locally to confirm end-to-end rendering.
# simple_video_builder
