import { useCallback, useEffect, useState } from 'react';
import './App.css';

type GenerateResponse = {
  id?: string;
  videoUrl?: string;
  title?: string;
  sceneCount?: number;
  error?: string;
};

type VideoListItem = {
  id: string;
  title: string;
  videoUrl: string;
  sceneCount: number;
  createdAt: string;
  sizeBytes: number;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    try {
      const response = await fetch('/api/videos');
      const data = (await response.json()) as {
        videos?: VideoListItem[];
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Failed to load videos.');
      }

      setVideos(data.videos ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load videos.';
      setError(message);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a topic or instruction.');
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setTitle(null);
    setCurrentVideoId(null);

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
      setCurrentVideoId(data.id ?? null);
      await loadVideos();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Video generation failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this video? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Failed to delete video.');
      }

      if (currentVideoId === id) {
        setVideoUrl(null);
        setTitle(null);
        setCurrentVideoId(null);
      }

      await loadVideos();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete video.';
      setError(message);
    } finally {
      setDeletingId(null);
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

      <section className="video-list-section">
        <div className="video-list-header">
          <h2>Created Videos</h2>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void loadVideos()}
            disabled={listLoading}
          >
            Refresh
          </button>
        </div>

        {listLoading ? (
          <p className="status loading">Loading videos…</p>
        ) : videos.length === 0 ? (
          <p className="status">No videos yet. Generate one above.</p>
        ) : (
          <ul className="video-list">
            {videos.map((video) => (
              <li key={video.id} className="video-list-item">
                <div className="video-list-info">
                  <strong className="video-list-title">{video.title}</strong>
                  <span className="video-list-meta">
                    {formatDate(video.createdAt)}
                    {video.sceneCount > 0 && ` · ${video.sceneCount} scenes`}
                    {` · ${formatSize(video.sizeBytes)}`}
                  </span>
                </div>
                <div className="video-list-actions">
                  <a
                    className="button button-secondary"
                    href={video.videoUrl}
                    download={`${video.title.replace(/[^\w\s-]/g, '').trim() || video.id}.mp4`}
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => void handleDelete(video.id)}
                    disabled={deletingId === video.id}
                  >
                    {deletingId === video.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
