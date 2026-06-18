import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { FPS } from '../constants';
import {
  getOutputAudioDir,
  getPublicAudioDir,
} from '../paths';
import type { SceneWithAudio, ScriptScene } from '../types';

function getClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set.');
  }

  return new ElevenLabsClient({ apiKey });
}

function getVoiceId(): string {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    throw new Error('ELEVENLABS_VOICE_ID is not set.');
  }

  return voiceId;
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks);
}

async function measureDurationSeconds(filePath: string): Promise<number> {
  const metadata = await parseFile(filePath);
  const duration = metadata.format.duration;

  if (!duration || duration <= 0) {
    throw new Error(`Could not measure audio duration for ${filePath}.`);
  }

  return duration;
}

export async function generateAllAudio(
  scenes: ScriptScene[],
  requestId: string,
): Promise<SceneWithAudio[]> {
  const client = getClient();
  const voiceId = getVoiceId();
  const modelId = process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';

  const outputAudioDir = getOutputAudioDir(requestId);
  const publicAudioDir = getPublicAudioDir(requestId);
  await mkdir(outputAudioDir, { recursive: true });
  await mkdir(publicAudioDir, { recursive: true });

  const scenesWithAudio: SceneWithAudio[] = [];

  for (const [index, scene] of scenes.entries()) {
    const fileName = `scene-${index}.mp3`;
    const outputPath = path.join(outputAudioDir, fileName);
    const publicPath = path.join(publicAudioDir, fileName);

    try {
      const audioStream = await client.textToSpeech.convert(voiceId, {
        text: scene.narration,
        modelId,
        outputFormat: 'mp3_44100_128',
      });

      const audioBuffer = await streamToBuffer(audioStream);
      await writeFile(outputPath, audioBuffer);
      await copyFile(outputPath, publicPath);

      const durationSeconds = await measureDurationSeconds(outputPath);
      const durationInFrames = Math.max(1, Math.ceil(durationSeconds * FPS));

      scenesWithAudio.push({
        ...scene,
        durationInFrames,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown ElevenLabs error';
      throw new Error(
        `ElevenLabs: Audio generation failed for scene ${index + 1}: ${message}`,
      );
    }
  }

  return scenesWithAudio;
}
