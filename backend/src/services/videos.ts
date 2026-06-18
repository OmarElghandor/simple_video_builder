import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  deleteCloudinaryVideo,
  isCloudinaryConfigured,
  listCloudinaryVideos,
  uploadVideo,
} from './cloudinary';
import {
  getOutputAudioDir,
  getPublicAudioDir,
  getVideosDir,
} from '../paths';

export type VideoMetadata = {
  title: string;
  sceneCount: number;
  createdAt: string;
};

export type VideoListItem = {
  id: string;
  title: string;
  videoUrl: string;
  sceneCount: number;
  createdAt: string;
  sizeBytes: number;
};

function getVideoPath(id: string): string {
  return path.join(getVideosDir(), `${id}.mp4`);
}

function getMetadataPath(id: string): string {
  return path.join(getVideosDir(), `${id}.meta.json`);
}

function isValidVideoId(id: string): boolean {
  return /^req-\d+$/.test(id) || id === 'smoke-test';
}

export async function saveVideoMetadata(
  id: string,
  metadata: VideoMetadata,
): Promise<void> {
  await writeFile(getMetadataPath(id), JSON.stringify(metadata, null, 2));
}

async function readVideoMetadata(id: string): Promise<VideoMetadata | null> {
  try {
    const raw = await readFile(getMetadataPath(id), 'utf8');
    return JSON.parse(raw) as VideoMetadata;
  } catch {
    return null;
  }
}

async function listLocalVideos(): Promise<VideoListItem[]> {
  const videosDir = getVideosDir();
  let entries: string[];

  try {
    entries = await readdir(videosDir);
  } catch {
    return [];
  }

  const mp4Files = entries.filter((name) => name.endsWith('.mp4'));
  const videos = await Promise.all(
    mp4Files.map(async (fileName) => {
      const id = fileName.replace(/\.mp4$/, '');
      const filePath = path.join(videosDir, fileName);
      const fileStat = await stat(filePath);
      const metadata = await readVideoMetadata(id);

      return {
        id,
        title: metadata?.title ?? id,
        videoUrl: `/output/videos/${fileName}`,
        sceneCount: metadata?.sceneCount ?? 0,
        createdAt: metadata?.createdAt ?? fileStat.mtime.toISOString(),
        sizeBytes: fileStat.size,
      };
    }),
  );

  return videos.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function deleteLocalVideo(id: string): Promise<boolean> {
  const videoPath = getVideoPath(id);
  try {
    await stat(videoPath);
  } catch {
    return false;
  }

  await rm(videoPath, { force: true });
  await rm(getMetadataPath(id), { force: true });
  await rm(getOutputAudioDir(id), { recursive: true, force: true });
  await rm(getPublicAudioDir(id), { recursive: true, force: true });

  return true;
}

export async function publishVideo(
  id: string,
  metadata: VideoMetadata,
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    await saveVideoMetadata(id, metadata);
    return `/output/videos/${id}.mp4`;
  }

  const localPath = getVideoPath(id);
  const cloudUrl = await uploadVideo(localPath, id, metadata);
  await deleteLocalVideo(id);
  return cloudUrl;
}

export async function listVideos(): Promise<VideoListItem[]> {
  if (isCloudinaryConfigured()) {
    return listCloudinaryVideos();
  }

  return listLocalVideos();
}

export async function deleteVideo(id: string): Promise<boolean> {
  if (!isValidVideoId(id)) {
    return false;
  }

  if (isCloudinaryConfigured()) {
    return deleteCloudinaryVideo(id);
  }

  return deleteLocalVideo(id);
}

export function usesCloudinaryStorage(): boolean {
  return isCloudinaryConfigured();
}
