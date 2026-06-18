import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRouter } from './routes/generate';
import { videosRouter } from './routes/videos';
import { warmupRemotionBundle } from './services/remotion';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const port = Number(process.env.PORT ?? 3001);

async function ensureDirectories(): Promise<void> {
  await mkdir(path.join(backendRoot, 'output', 'audio'), { recursive: true });
  await mkdir(path.join(backendRoot, 'output', 'videos'), { recursive: true });
  await mkdir(path.join(backendRoot, 'public', 'audio'), { recursive: true });
}

async function startServer(): Promise<void> {
  await ensureDirectories();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/output', express.static(path.join(backendRoot, 'output')));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', generateRouter);
  app.use('/api', videosRouter);

  const frontendDist = path.join(backendRoot, 'frontend-dist');
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/output')) {
        next();
        return;
      }
      res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  const server = app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });

  server.timeout = 0;
  server.requestTimeout = 0;
  server.headersTimeout = 0;

  try {
    await warmupRemotionBundle();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Remotion bundle error';
    console.error(`Remotion bundle warmup failed: ${message}`);
    console.error('Video rendering will not work until this is resolved.');
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
