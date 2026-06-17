import Anthropic from '@anthropic-ai/sdk';
import type { LessonScript } from '../types';

const SYSTEM_PROMPT = `You are a script writer for short teaching videos.

Return ONLY valid JSON with no markdown, no code fences, and no extra text.

The JSON must match this schema:
{
  "title": "string",
  "scenes": [
    {
      "narration": "string",
      "caption": "string"
    }
  ]
}

Rules:
- Create a 3-5 minute lesson broken into about 8-15 scenes.
- Each scene must have:
  - narration: what the narrator speaks aloud
  - caption: what appears on screen (include Arabic and English where relevant)
- Keep narration natural and educational.
- Do not include any keys outside the schema.`;

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function validateScript(value: unknown): LessonScript {
  if (!value || typeof value !== 'object') {
    throw new Error('Script must be a JSON object.');
  }

  const script = value as Partial<LessonScript>;

  if (!script.title || typeof script.title !== 'string') {
    throw new Error('Script is missing a valid title.');
  }

  if (!Array.isArray(script.scenes) || script.scenes.length === 0) {
    throw new Error('Script must include a non-empty scenes array.');
  }

  for (const [index, scene] of script.scenes.entries()) {
    if (!scene || typeof scene !== 'object') {
      throw new Error(`Scene ${index + 1} is invalid.`);
    }

    if (typeof scene.narration !== 'string' || !scene.narration.trim()) {
      throw new Error(`Scene ${index + 1} is missing narration.`);
    }

    if (typeof scene.caption !== 'string' || !scene.caption.trim()) {
      throw new Error(`Scene ${index + 1} is missing caption.`);
    }
  }

  return {
    title: script.title.trim(),
    scenes: script.scenes.map((scene) => ({
      narration: scene.narration.trim(),
      caption: scene.caption.trim(),
    })),
  };
}

function parseScriptResponse(text: string): LessonScript {
  const cleaned = stripJsonFences(text);
  const parsed = JSON.parse(cleaned) as unknown;
  return validateScript(parsed);
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set.');
  }

  return new Anthropic({ apiKey });
}

async function requestScript(
  client: Anthropic,
  prompt: string,
  retryMessage?: string,
): Promise<string> {
  const model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-20250514';

  const messages: Anthropic.MessageParam[] = retryMessage
    ? [
        { role: 'user', content: prompt },
        { role: 'assistant', content: retryMessage },
        {
          role: 'user',
          content:
            'Your previous response was not valid JSON. Return only the JSON object.',
        },
      ]
    : [{ role: 'user', content: prompt }];

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an empty response.');
  }

  return textBlock.text;
}

export async function generateScript(prompt: string): Promise<LessonScript> {
  const client = getClient();
  const userPrompt = `Create a teaching video script for this topic:\n\n${prompt}`;

  let firstResponse = '';
  try {
    firstResponse = await requestScript(client, userPrompt);
    return parseScriptResponse(firstResponse);
  } catch (firstError) {
    try {
      const secondResponse = await requestScript(
        client,
        userPrompt,
        firstResponse || 'Invalid JSON',
      );
      return parseScriptResponse(secondResponse);
    } catch {
      const raw =
        firstError instanceof Error
          ? firstError.message
          : 'Failed to parse Claude response as JSON.';
      const message = raw.includes('Anthropic') || raw.includes('authentication')
        ? raw
        : `Anthropic: ${raw}`;
      throw new Error(`Script generation failed: ${message}`);
    }
  }
}
