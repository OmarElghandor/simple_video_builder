FROM node:22-bookworm-slim

# Chromium shared libraries (Remotion headless shell) and ffmpeg for audio/video.
RUN apt-get update && apt-get install -y --no-install-recommends \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Install all dependencies (including dev) needed for build and smoke-test scripts.
RUN cd backend && npm ci --include=dev
RUN cd frontend && npm ci --include=dev

COPY backend ./backend
COPY frontend ./frontend

RUN cd frontend && npm run build
RUN cd backend && npm run build
RUN cp -r frontend/dist backend/frontend-dist

WORKDIR /app/backend

# Install and verify Chrome Headless Shell at image build time (not on first request).
RUN node scripts/ensure-browser.mjs && \
    find node_modules/.remotion/chrome-headless-shell -name chrome-headless-shell -type f | grep -q .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]
