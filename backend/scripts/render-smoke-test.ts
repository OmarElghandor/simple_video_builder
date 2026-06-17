import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseFile } from 'music-metadata';
import { FPS } from '../src/constants';
import { renderLessonVideo, warmupRemotionBundle } from '../src/services/remotion';
import type { LessonScript, SceneWithAudio } from '../src/types';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

async function createSilentMp3(
  outputPath: string,
  durationSeconds: number,
): Promise<void> {
  await execFileAsync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=44100:cl=mono',
    '-t',
    String(durationSeconds),
    '-q:a',
    '9',
    '-acodec',
    'libmp3lame',
    outputPath,
  ]);
}

async function main(): Promise<void> {
  const requestId = 'smoke-test';
  const outputAudioDir = path.join(backendRoot, 'output', 'audio', requestId);
  const publicAudioDir = path.join(backendRoot, 'public', 'audio', requestId);
  await mkdir(outputAudioDir, { recursive: true });
  await mkdir(publicAudioDir, { recursive: true });

  const script: LessonScript = {
    title: 'Smoke Test Lesson',
    scenes: [
      { narration: 'Scene one', caption: 'Scene One / المشهد الأول' },
      { narration: 'Scene two', caption: 'Scene Two / المشهد الثاني' },
    ],
  };

  const scenesWithAudio: SceneWithAudio[] = [];

  for (const [index, scene] of script.scenes.entries()) {
    const fileName = `scene-${index}.mp3`;
    const outputPath = path.join(outputAudioDir, fileName);
    const publicPath = path.join(publicAudioDir, fileName);
    const durationSeconds = 2 + index;

    await createSilentMp3(outputPath, durationSeconds);
    await createSilentMp3(publicPath, durationSeconds);

    const metadata = await parseFile(outputPath);
    const measuredDuration = metadata.format.duration ?? durationSeconds;

    scenesWithAudio.push({
      ...scene,
      durationInFrames: Math.max(1, Math.ceil(measuredDuration * FPS)),
    });
  }

  await warmupRemotionBundle();
  const videoUrl = await renderLessonVideo(script, scenesWithAudio, requestId);

  console.log(`Smoke test passed. Video available at ${videoUrl}`);
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
