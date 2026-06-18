import { v2 as cloudinary } from 'cloudinary';

const VIDEO_FOLDER = 'lesson-videos';

type VideoMetadata = {
  title: string;
  sceneCount: number;
  createdAt: string;
};

export type CloudinaryVideoListItem = {
  id: string;
  title: string;
  videoUrl: string;
  sceneCount: number;
  createdAt: string;
  sizeBytes: number;
};

export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL) {
    return true;
  }

  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function configureCloudinary(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    );
  }

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function getPublicId(id: string): string {
  return `${VIDEO_FOLDER}/${id}`;
}

function parseContextValue(
  context: Record<string, string> | undefined,
  key: string,
): string | undefined {
  return context?.[key];
}

export async function uploadVideo(
  localPath: string,
  id: string,
  metadata: VideoMetadata,
): Promise<string> {
  configureCloudinary();

  const result = await cloudinary.uploader.upload(localPath, {
    resource_type: 'video',
    folder: VIDEO_FOLDER,
    public_id: id,
    overwrite: true,
    context: {
      title: metadata.title,
      sceneCount: String(metadata.sceneCount),
      createdAt: metadata.createdAt,
    },
  });

  return result.secure_url;
}

export async function listCloudinaryVideos(): Promise<CloudinaryVideoListItem[]> {
  configureCloudinary();

  const result = await cloudinary.api.resources({
    type: 'upload',
    resource_type: 'video',
    prefix: `${VIDEO_FOLDER}/`,
    max_results: 100,
  });

  const videos = (result.resources as Array<{
    public_id: string;
    secure_url: string;
    bytes: number;
    created_at: string;
    context?: { custom?: Record<string, string> };
  }>).map((resource) => {
    const id = resource.public_id.replace(`${VIDEO_FOLDER}/`, '');
    const context = resource.context?.custom;

    return {
      id,
      title: parseContextValue(context, 'title') ?? id,
      videoUrl: resource.secure_url,
      sceneCount: Number.parseInt(parseContextValue(context, 'sceneCount') ?? '0', 10),
      createdAt:
        parseContextValue(context, 'createdAt') ??
        new Date(resource.created_at).toISOString(),
      sizeBytes: resource.bytes,
    };
  });

  return videos.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function deleteCloudinaryVideo(id: string): Promise<boolean> {
  configureCloudinary();

  const result = await cloudinary.uploader.destroy(getPublicId(id), {
    resource_type: 'video',
  });

  return result.result === 'ok';
}
