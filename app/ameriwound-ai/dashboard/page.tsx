"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImageFiles(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/ameriwound-ai/");
  }

  async function handleProcess() {
    if (!audioFile) {
      setStatus("Please upload an audio file.");
      return;
    }

    setLoading(true);
    setStatus("Transcribing audio…");
    setTranscript("");
    setNotes("");

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const transcribeData = await transcribeRes.json();

      if (!transcribeRes.ok) {
        setStatus(transcribeData.error || "Transcription failed.");
        return;
      }

      const text = transcribeData.transcript;
      setTranscript(text);
      setStatus("Generating wound care notes…");

      const imageDescriptions = imageFiles.map(
        (f, i) => `Image ${i + 1}: ${f.name} (wound photograph uploaded for documentation)`
      );

      const notesRes = await fetch("/api/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, imageDescriptions }),
      });
      const notesData = await notesRes.json();

      if (!notesRes.ok) {
        setStatus(notesData.error || "Note generation failed.");
        return;
      }

      setNotes(notesData.notes);
      setStatus("Done! Wound care notes generated.");
    } catch {
      setStatus("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyNotes() {
    if (notes) navigator.clipboard.writeText(notes);
  }

  return (
    <div className="ai-dash">
      <header className="ai-dash-header">
        <div className="ai-dash-brand">
          <img
            src="/assets/wp-content/uploads/2024/11/site-logo350x100.svg"
            alt="AmeriWound"
            className="ai-dash-logo"
          />
          <span>AmeriWound AI</span>
        </div>
        <nav className="ai-dash-nav">
          <Link href="/ameriwound-ai/admin/">Admin</Link>
          <button onClick={handleLogout} className="ai-btn ai-btn-ghost">
            Sign Out
          </button>
        </nav>
      </header>

      <main className="ai-dash-main">
        <h1>Wound Care Documentation</h1>
        <p className="ai-dash-sub">
          Upload an audio recording of your patient encounter and wound images.
          AI will transcribe the audio and generate professional wound care notes.
        </p>

        <div className="ai-dash-grid">
          <section className="ai-panel">
            <h2>Upload Files</h2>

            <label className="ai-upload">
              <span className="ai-upload-label">Audio Recording</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
              {audioFile && <span className="ai-file-name">{audioFile.name}</span>}
            </label>

            <label className="ai-upload">
              <span className="ai-upload-label">Wound Images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImages}
              />
              {imageFiles.length > 0 && (
                <span className="ai-file-name">
                  {imageFiles.length} image(s) selected
                </span>
              )}
            </label>

            {imagePreviews.length > 0 && (
              <div className="ai-previews">
                {imagePreviews.map((src, i) => (
                  <img key={i} src={src} alt={`Wound ${i + 1}`} />
                ))}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={loading || !audioFile}
              className="ai-btn ai-btn-primary ai-btn-lg"
            >
              {loading ? "Processing…" : "Generate Wound Care Notes"}
            </button>

            {status && <p className="ai-status">{status}</p>}
          </section>

          <section className="ai-panel">
            <h2>Transcript</h2>
            <textarea
              className="ai-textarea"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Audio transcript will appear here…"
              rows={8}
            />

            <div className="ai-notes-header">
              <h2>Wound Care Notes</h2>
              {notes && (
                <button onClick={copyNotes} className="ai-btn ai-btn-ghost">
                  Copy
                </button>
              )}
            </div>
            <textarea
              className="ai-textarea ai-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Generated wound care notes will appear here…"
              rows={16}
            />
          </section>
        </div>
      </main>

      <style jsx global>{`
        .ai-dash {
          min-height: 100vh;
          background: #f4f7fa;
          font-family: "Montserrat", "Segoe UI", system-ui, sans-serif;
        }
        .ai-dash-header {
          background: #0a3d62;
          color: #fff;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ai-dash-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 600;
          font-size: 1.1rem;
        }
        .ai-dash-logo {
          height: 36px;
          filter: brightness(0) invert(1);
        }
        .ai-dash-nav {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ai-dash-nav a {
          color: #fff;
          text-decoration: none;
          font-size: 0.9rem;
          opacity: 0.9;
        }
        .ai-dash-nav a:hover {
          opacity: 1;
          text-decoration: underline;
        }
        .ai-dash-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        .ai-dash-main h1 {
          color: #0a3d62;
          margin: 0 0 0.5rem;
        }
        .ai-dash-sub {
          color: #666;
          margin: 0 0 2rem;
        }
        .ai-dash-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        @media (max-width: 900px) {
          .ai-dash-grid {
            grid-template-columns: 1fr;
          }
        }
        .ai-panel {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .ai-panel h2 {
          color: #0a3d62;
          font-size: 1.1rem;
          margin: 0 0 1rem;
        }
        .ai-upload {
          display: block;
          margin-bottom: 1rem;
          padding: 1rem;
          border: 2px dashed #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .ai-upload:hover {
          border-color: #2980b9;
        }
        .ai-upload input {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.85rem;
        }
        .ai-upload-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #333;
        }
        .ai-file-name {
          display: block;
          margin-top: 0.35rem;
          font-size: 0.8rem;
          color: #2980b9;
        }
        .ai-previews {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .ai-previews img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #ddd;
        }
        .ai-btn {
          display: inline-block;
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .ai-btn-primary {
          background: #0a3d62;
          color: #fff;
        }
        .ai-btn-primary:hover:not(:disabled) {
          background: #0d4f7a;
        }
        .ai-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ai-btn-lg {
          width: 100%;
          padding: 0.85rem;
          font-size: 1rem;
        }
        .ai-btn-ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .ai-panel .ai-btn-ghost {
          color: #0a3d62;
          border-color: #ddd;
        }
        .ai-status {
          margin-top: 1rem;
          font-size: 0.85rem;
          color: #2980b9;
        }
        .ai-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.9rem;
          line-height: 1.5;
          resize: vertical;
          box-sizing: border-box;
          margin-bottom: 1rem;
        }
        .ai-notes {
          font-family: "Consolas", "Courier New", monospace;
          font-size: 0.85rem;
        }
        .ai-notes-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ai-notes-header h2 {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
