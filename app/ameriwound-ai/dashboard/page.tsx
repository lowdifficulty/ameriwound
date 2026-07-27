"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "../components/PortalHeader";
import { FileDropzone } from "../components/FileDropzone";

type Step = "upload" | "transcribe" | "generate" | "done";

function AudioIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [toast, setToast] = useState("");

  function handleAudio(files: File[]) {
    setAudioFile(files[0] ?? null);
    if (files[0]) setStep("upload");
  }

  function handleImages(files: File[]) {
    setImageFiles(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/ameriwound-ai/");
  }

  async function handleProcess() {
    if (!audioFile) {
      setStatus("Please upload an audio recording to continue.");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setStep("transcribe");
    setStatus("Transcribing your audio recording…");
    setStatusType("info");
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
        setStatusType("error");
        setStep("upload");
        return;
      }

      const text = transcribeData.transcript;
      setTranscript(text);
      setStep("generate");
      setStatus("Generating professional wound care notes…");
      setStatusType("info");

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
        setStatusType("error");
        setStep("transcribe");
        return;
      }

      setNotes(notesData.notes);
      setStep("done");
      setStatus("Wound care notes generated successfully.");
      setStatusType("success");
    } catch {
      setStatus("Something went wrong. Please try again.");
      setStatusType("error");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  function copyNotes() {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setToast("Copied to clipboard");
    setTimeout(() => setToast(""), 2500);
  }

  const steps: { id: Step; label: string; num: number }[] = [
    { id: "upload", label: "Upload", num: 1 },
    { id: "transcribe", label: "Transcribe", num: 2 },
    { id: "generate", label: "Generate Notes", num: 3 },
    { id: "done", label: "Complete", num: 4 },
  ];

  const stepOrder: Step[] = ["upload", "transcribe", "generate", "done"];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="portal">
      <PortalHeader onLogout={handleLogout} />

      <main className="portal-main">
        <div className="portal-hero">
          <h1>Wound Care Documentation</h1>
          <p>
            Upload your encounter audio and wound images. AI transcribes the
            recording and produces structured, clinical-grade documentation.
          </p>
        </div>

        <div className="pipeline" role="list" aria-label="Processing steps">
          {steps.map((s, i) => {
            const idx = stepOrder.indexOf(s.id);
            const isDone = idx < currentIdx || step === "done";
            const isActive = s.id === step && step !== "done";
            return (
              <div key={s.id} style={{ display: "contents" }}>
                {i > 0 && (
                  <div className={`pipeline-connector${isDone ? " done" : ""}`} />
                )}
                <div
                  className={`pipeline-step${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                  role="listitem"
                >
                  <div className="pipeline-step-icon">
                    {isDone ? <CheckIcon /> : s.num}
                  </div>
                  <span className="pipeline-step-label">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="portal-grid">
          {/* Upload column */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2>Upload Files</h2>
              <span className="badge">Step 1</span>
            </div>
            <div className="portal-card-body">
              <FileDropzone
                accept="audio/*"
                title="Audio Recording"
                hint="Drop file here or click to browse · MP3, WAV, M4A"
                icon={<AudioIcon />}
                fileLabel={audioFile?.name}
                onChange={handleAudio}
              />

              <FileDropzone
                accept="image/*"
                multiple
                title="Wound Images"
                hint="Optional · JPG, PNG, HEIC · Multiple files supported"
                icon={<ImageIcon />}
                fileLabel={
                  imageFiles.length > 0
                    ? `${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""} selected`
                    : undefined
                }
                onChange={handleImages}
              />

              {imagePreviews.length > 0 && (
                <div className="preview-grid">
                  {imagePreviews.map((src, i) => (
                    <div key={src} className="preview-thumb">
                      <img src={src} alt={`Wound ${i + 1}`} />
                      <span>#{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleProcess}
                disabled={loading || !audioFile}
                className="portal-btn portal-btn-primary portal-btn-lg"
              >
                {loading ? (
                  <>
                    <span className="status-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Processing…
                  </>
                ) : (
                  "Generate Wound Care Notes"
                )}
              </button>

              {status && (
                <div className={`status-banner ${statusType}`} role="status">
                  {loading && <span className="status-spinner" />}
                  {status}
                </div>
              )}
            </div>
          </div>

          {/* Output column */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2>Clinical Output</h2>
              {notes && (
                <div className="output-actions">
                  <button
                    type="button"
                    onClick={copyNotes}
                    className="portal-btn portal-btn-secondary"
                  >
                    Copy Notes
                  </button>
                </div>
              )}
            </div>
            <div className="portal-card-body">
              <div className="portal-field">
                <label htmlFor="transcript">Transcript</label>
                {transcript ? (
                  <textarea
                    id="transcript"
                    className="portal-textarea"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                  />
                ) : (
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                    <p>Transcript will appear here after audio processing</p>
                  </div>
                )}
              </div>

              <div className="portal-field">
                <label htmlFor="notes">Wound Care Notes</label>
                {notes ? (
                  <textarea
                    id="notes"
                    className="portal-textarea notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={14}
                  />
                ) : (
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <p>Structured clinical notes will be generated from your transcript</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast" role="alert">
          <CheckIcon />
          {toast}
        </div>
      )}
    </div>
  );
}
