import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LessonScript, LessonVideoProps, SceneWithAudio } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');
const remotionEntry = path.join(backendRoot, 'remotion', 'index.ts');

let cachedServeUrl: string | null = null;

export async function warmupRemotionBundle(): Promise<string> {
  if (cachedServeUrl) {
    return cachedServeUrl;
  }

  console.log('Bundling Remotion project...');
  cachedServeUrl = await bundle({
    entryPoint: remotionEntry,
    publicDir: path.join(backendRoot, 'public'),
    webpackOverride: (config) => config,
  });

  console.log('Remotion bundle ready.');
  return cachedServeUrl;
}

export async function renderLessonVideo(
  script: LessonScript,
  scenesWithAudio: SceneWithAudio[],
  requestId: string,
): Promise<string> {
  const serveUrl = await warmupRemotionBundle();
  const videosDir = path.join(backendRoot, 'output', 'videos');
  await mkdir(videosDir, { recursive: true });

  const outputLocation = path.join(videosDir, `${requestId}.mp4`);

  const inputProps: LessonVideoProps = {
    title: script.title,
    scenes: scenesWithAudio.map((scene, index) => ({
      caption: scene.caption,
      audioFile: `audio/${requestId}/scene-${index}.mp3`,
      durationInFrames: scene.durationInFrames,
    })),
  };

  const composition = await selectComposition({
    serveUrl,
    id: 'LessonVideo',
    inputProps,
  });

  console.log(`Rendering video for request ${requestId}...`);

  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    outputLocation,
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      if (percent % 10 === 0) {
        console.log(`Render progress: ${percent}%`);
      }
    },
  });

  return `/output/videos/${requestId}.mp4`;
}
