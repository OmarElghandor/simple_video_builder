import { useState } from 'react';
import './App.css';

type GenerateResponse = {
  videoUrl?: string;
  title?: string;
  sceneCount?: number;
  error?: string;
};

function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a topic or instruction.');
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setTitle(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Video generation failed.');
      }

      if (!data.videoUrl) {
        throw new Error('No video URL returned from the server.');
      }

      setVideoUrl(data.videoUrl);
      setTitle(data.title ?? null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Video generation failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header className="header">
        <h1>AI Lesson Video Generator</h1>
        <p className="subtitle">
          Enter a teaching topic and generate a narrated lesson video.
        </p>
      </header>

      <section className="panel">
        <label className="label" htmlFor="prompt">
          Topic or instruction
        </label>
        <textarea
          id="prompt"
          className="textarea"
          rows={6}
          placeholder='e.g. "Teach ordering coffee in English for an Arabic-speaking beginner"'
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={loading}
        />

        <button
          type="button"
          className="button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Generate Video'}
        </button>

        {loading && (
          <p className="status loading">
            Generating script, narration, and video… This may take several
            minutes.
          </p>
        )}

        {error && <p className="status error">{error}</p>}
      </section>

      {videoUrl && (
        <section className="result">
          {title && <h2>{title}</h2>}
          <video className="video" controls src={videoUrl} />
        </section>
      )}
    </main>
  );
}

export default App;
