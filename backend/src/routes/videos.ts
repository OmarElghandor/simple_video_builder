import { Router } from 'express';
import { deleteVideo, listVideos } from '../services/videos';

export const videosRouter = Router();

videosRouter.get('/videos', async (_req, res) => {
  try {
    const videos = await listVideos();
    return res.json({ videos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to list videos.';
    return res.status(500).json({ error: message });
  }
});

videosRouter.delete('/videos/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const deleted = await deleteVideo(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    return res.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete video.';
    return res.status(500).json({ error: message });
  }
});
