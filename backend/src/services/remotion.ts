import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LessonScript, LessonVideoProps, SceneWithAudio } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '../..');
const remotionEntry = path.join(backendRoot, 'remotion', 'index.ts');
const publicDir = path.join(backendRoot, 'public');

let cachedBundleOutDir: string | null = null;

async function syncRequestAudioToBundle(
  bundleOutDir: string,
  requestId: string,
): Promise<void> {
  const sourceDir = path.join(publicDir, 'audio', requestId);
  const targetDir = path.join(bundleOutDir, 'public', 'audio', requestId);
  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
}

export async function warmupRemotionBundle(): Promise<string> {
  if (cachedBundleOutDir) {
    return cachedBundleOutDir;
  }

  console.log('Bundling Remotion project...');
  cachedBundleOutDir = await bundle({
    entryPoint: remotionEntry,
    publicDir,
    webpackOverride: (config) => config,
  });

  console.log('Remotion bundle ready.');
  return cachedBundleOutDir;
}

export async function renderLessonVideo(
  script: LessonScript,
  scenesWithAudio: SceneWithAudio[],
  requestId: string,
): Promise<string> {
  const bundleOutDir = await warmupRemotionBundle();
  await syncRequestAudioToBundle(bundleOutDir, requestId);

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
    serveUrl: bundleOutDir,
    id: 'LessonVideo',
    inputProps,
  });

  console.log(`Rendering video for request ${requestId}...`);

  await renderMedia({
    serveUrl: bundleOutDir,
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
