import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const backendRoot = path.resolve(__dirname, '..');

/** Where MP4s and scene audio are stored. Use a Railway Volume mount at this path in production. */
export function getOutputRoot(): string {
  return process.env.RAILWAY_VOLUME_MOUNT_PATH ?? path.join(backendRoot, 'output');
}

export function getVideosDir(): string {
  return path.join(getOutputRoot(), 'videos');
}

export function getOutputAudioDir(requestId: string): string {
  return path.join(getOutputRoot(), 'audio', requestId);
}

export function getPublicDir(): string {
  return path.join(backendRoot, 'public');
}

export function getPublicAudioDir(requestId: string): string {
  return path.join(getPublicDir(), 'audio', requestId);
}

export function hasPersistentStorage(): boolean {
  return Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH);
}
