import { Router } from 'express';
import { generateScript } from '../services/claude';
import { generateAllAudio } from '../services/elevenlabs';
import { renderLessonVideo } from '../services/remotion';

export const generateRouter = Router();

generateRouter.post('/generate', async (req, res) => {
  const prompt = req.body?.prompt;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const requestId = `req-${Date.now()}`;

  try {
    console.log(`Starting request ${requestId}`);

    const script = await generateScript(prompt.trim());
    console.log(
      `Script ready: "${script.title}" with ${script.scenes.length} scenes`,
    );

    const scenesWithAudio = await generateAllAudio(script.scenes, requestId);
    console.log(`Audio ready for request ${requestId}`);

    const videoUrl = await renderLessonVideo(script, scenesWithAudio, requestId);
    console.log(`Video ready for request ${requestId}: ${videoUrl}`);

    return res.json({
      videoUrl,
      title: script.title,
      sceneCount: script.scenes.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Video generation failed.';

    const isClientError =
      message.includes('Script generation failed') ||
      message.includes('Prompt is required');

    console.error(`Request ${requestId} failed:`, message);

    return res.status(isClientError ? 400 : 500).json({ error: message });
  }
});
