"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "../components/PortalHeader";
import {
  type DemoPhase,
  type TranscriptLine,
  buildSoapBlocks,
  parseTranscript,
  splitSoapSections,
} from "../lib/demo-pipeline";

type Props = {
  transcriptRaw: string;
  soapRaw: string;
};

const TRANSCRIPT_DURATION_MS = 6000;
const LISTENING_DURATION_MS = 900;

const DEMO_PATIENT_NAME = "Robert Michael Hayes";

const NOTES_HISTORY = [
  { id: "current", date: "July 27, 2026", label: "AmchoPlast Application #5" },
  { id: "jul20", date: "July 20, 2026", label: "AmchoPlast Application #4" },
  { id: "jul13", date: "July 13, 2026", label: "AmchoPlast Application #3" },
  { id: "jul6", date: "July 6, 2026", label: "AmchoPlast Application #2" },
  { id: "jun29", date: "June 29, 2026", label: "AmchoPlast Application #1" },
];

const ANALYSIS_ITEMS = [
  "Speaker diarization",
  "Pain score extraction",
  "Wound measurements",
  "Debridement procedure",
  "AmchoPlast product fields",
  "Medical necessity criteria",
  "ICD-10 suggestions",
  "Plan & follow-up",
];

const SHORELINE_CHECKS = [
  "Patient identifiers & service dates verified",
  "Wound location, laterality & staging documented",
  "Wound measurements (L × W × D) present",
  "Wound bed tissue & exudate description complete",
  "Debridement procedure & method documented",
  "Medical necessity criteria satisfied",
  "AmchoPlast application fully documented",
  "ICD-10 codes supported by clinical findings",
  "Treatment plan & follow-up interval specified",
  "Provider attestation & Medicare compliance met",
];

const IVR_CHECKS = [
  "Connecting to payer eligibility system",
  "Verifying member ID and date of birth",
  "Confirming Medicare Part B active coverage",
  "Checking wound care and skin substitute benefits",
];
const IVR_DURATION_MS = 8_000;
const IVR_SUCCESS_DELAY_MS = 400;
const IVR_STEP_MS = (IVR_DURATION_MS - IVR_SUCCESS_DELAY_MS) / IVR_CHECKS.length;

function EncounterAudio({ active, progress }: { active: boolean; progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(226, 232, 240, 0.9)";
      ctx.lineWidth = 1;
      for (let y = 0.25; y <= 0.75; y += 0.25) {
        const ly = h * y;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(w, ly);
        ctx.stroke();
      }

      const mid = h / 2;
      const t = active ? frameRef.current * 0.04 : 0;
      frameRef.current += 1;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const nx = x / w;
        const envelope =
          active
            ? 0.35 +
              0.25 * Math.sin(nx * 8 + t * 1.2) +
              0.15 * Math.sin(nx * 19 - t * 0.8) +
              0.08 * Math.sin(nx * 37 + t * 1.6)
            : 0.08;
        const y = mid + Math.sin(nx * Math.PI * 14 + t * 2) * envelope * (h * 0.38);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(30, 111, 168, 0.15)");
      grad.addColorStop(0.5, "rgba(30, 111, 168, 0.45)");
      grad.addColorStop(1, "rgba(13, 148, 136, 0.35)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(w, mid);
      ctx.lineTo(0, mid);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, "rgba(30, 111, 168, 0.12)");
      fill.addColorStop(1, "rgba(30, 111, 168, 0)");
      ctx.fillStyle = fill;
      ctx.fill();

      const playhead = Math.min(1, Math.max(0, progress)) * w;
      ctx.strokeStyle = "rgba(10, 61, 98, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(playhead, 8);
      ctx.lineTo(playhead, h - 8);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#0a3d62";
      ctx.beginPath();
      ctx.arc(playhead, mid, 4, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, progress]);

  return (
    <div className="demo-audio-visual" aria-hidden={!active}>
      <div className="demo-audio-visual__head">
        <div className="demo-audio-visual__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div>
          <strong>Encounter audio</strong>
          <span>Provider office · Right plantar diabetic foot ulcer follow-up</span>
        </div>
        {active && (
          <span className="demo-audio-visual__badge">
            <span className="demo-audio-visual__dot" />
            Processing
          </span>
        )}
      </div>
      <canvas ref={canvasRef} className="demo-audio-visual__canvas" />
    </div>
  );
}

export function DemoExperience({ transcriptRaw, soapRaw }: Props) {
  const router = useRouter();
  const lines = useMemo(() => parseTranscript(transcriptRaw), [transcriptRaw]);
  const soapSections = useMemo(() => splitSoapSections(soapRaw), [soapRaw]);
  const soapFull = soapRaw.trim();

  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [visibleLines, setVisibleLines] = useState<TranscriptLine[]>([]);
  const [transcriptProgress, setTranscriptProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [soapText, setSoapText] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [notesHistoryId, setNotesHistoryId] = useState("current");
  const [emrSent, setEmrSent] = useState(false);
  const [emrModalOpen, setEmrModalOpen] = useState(false);
  const [emrApiKey, setEmrApiKey] = useState("");
  const [emrSecret, setEmrSecret] = useState("");
  const [soapEditing, setSoapEditing] = useState(false);
  const [shorelineModalOpen, setShorelineModalOpen] = useState(false);
  const [shorelineStep, setShorelineStep] = useState(0);
  const [shorelineSuccess, setShorelineSuccess] = useState(false);
  const [shorelineDone, setShorelineDone] = useState(false);
  const [ivrModalOpen, setIvrModalOpen] = useState(false);
  const [ivrStep, setIvrStep] = useState(0);
  const [ivrSuccess, setIvrSuccess] = useState(false);
  const [ivrDone, setIvrDone] = useState(false);
  const timers = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const soapRef = useRef<HTMLDivElement>(null);
  const running = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    if (phase === "idle") return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [visibleLines]);

  useEffect(() => {
    if (soapRef.current) {
      soapRef.current.scrollTop = soapRef.current.scrollHeight;
    }
  }, [soapText]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const startAnalyzing = useCallback(() => {
    setPhase("analyzing");
    setTranscriptProgress(1);
    setAnalysisStep(0);
    let step = 0;
    const nextAnalysis = () => {
      step += 1;
      setAnalysisStep(step);
      if (step < ANALYSIS_ITEMS.length) {
        addTimer(nextAnalysis, 280);
      } else {
        addTimer(() => {
          setPhase("generating");
          setActiveSection(soapSections[0]?.title ?? "Documentation");
          let pos = 0;
          const chunk = 28;
          const stream = () => {
            pos = Math.min(soapFull.length, pos + chunk);
            setSoapText(soapFull.slice(0, pos));
            setWordCount(soapFull.slice(0, pos).split(/\s+/).filter(Boolean).length);
            const currentTitle =
              soapSections.find((s, idx) => {
                const start = soapSections
                  .slice(0, idx)
                  .reduce((acc, sec) => acc + sec.title.length + sec.body.length + 2, 0);
                return pos >= start;
              })?.title ?? "Clinical Documentation";
            setActiveSection(currentTitle);
            if (pos < soapFull.length) {
              addTimer(stream, 18);
            } else {
              setPhase("complete");
              running.current = false;
            }
          };
          stream();
        }, 400);
      }
    };
    addTimer(nextAnalysis, 350);
  }, [addTimer, soapFull, soapSections]);

  const runTranscription = useCallback(() => {
    setPhase("transcribing");
    const start = performance.now();
    const tick = () => {
      const elapsedMs = performance.now() - start;
      const progress = Math.min(1, elapsedMs / TRANSCRIPT_DURATION_MS);
      const count = Math.max(0, Math.min(lines.length, Math.ceil(progress * lines.length)));
      setTranscriptProgress(progress);
      setVisibleLines(lines.slice(0, count));

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        setVisibleLines(lines);
        setTranscriptProgress(1);
        startAnalyzing();
      }
    };
    tick();
  }, [lines, startAnalyzing]);

  const startDemo = useCallback(() => {
    if (running.current) return;
    running.current = true;
    clearTimers();
    setPhase("listening");
    setVisibleLines([]);
    setTranscriptProgress(0);
    setSoapText("");
    setAnalysisStep(0);
    setElapsed(0);
    setWordCount(0);
    setActiveSection("");
    setNotesHistoryId("current");
    setEmrSent(false);
    setEmrModalOpen(false);
    setEmrApiKey("");
    setEmrSecret("");
    setSoapEditing(false);
    setShorelineModalOpen(false);
    setShorelineStep(0);
    setShorelineSuccess(false);
    setShorelineDone(false);
    setIvrModalOpen(false);
    setIvrStep(0);
    setIvrSuccess(false);
    setIvrDone(false);

    addTimer(runTranscription, LISTENING_DURATION_MS);
  }, [addTimer, clearTimers, runTranscription]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/ameriwound-ai/");
  }

  function handlePrimaryAction() {
    if (phase === "idle") {
      startDemo();
      return;
    }
    if (phase === "complete" && !emrSent) {
      setEmrModalOpen(true);
    }
  }

  function handleEmrSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emrApiKey.trim() || !emrSecret.trim()) return;
    setEmrModalOpen(false);
    setEmrSent(true);
  }

  function openShorelineModal() {
    setShorelineModalOpen(true);
    setShorelineStep(0);
    setShorelineSuccess(false);
  }

  function closeShorelineModal() {
    setShorelineModalOpen(false);
    if (shorelineSuccess) setShorelineDone(true);
  }

  function openIvrModal() {
    setIvrModalOpen(true);
    setIvrStep(0);
    setIvrSuccess(false);
  }

  function closeIvrModal() {
    setIvrModalOpen(false);
    if (ivrSuccess) setIvrDone(true);
  }

  useEffect(() => {
    if (!shorelineModalOpen || shorelineSuccess) return;
    if (shorelineStep >= SHORELINE_CHECKS.length) {
      const id = window.setTimeout(() => setShorelineSuccess(true), 400);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setShorelineStep((s) => s + 1), 520);
    return () => window.clearTimeout(id);
  }, [shorelineModalOpen, shorelineStep, shorelineSuccess]);

  useEffect(() => {
    if (!ivrModalOpen || ivrSuccess) return;
    if (ivrStep >= IVR_CHECKS.length) {
      const id = window.setTimeout(() => setIvrSuccess(true), IVR_SUCCESS_DELAY_MS);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setIvrStep((s) => s + 1), IVR_STEP_MS);
    return () => window.clearTimeout(id);
  }, [ivrModalOpen, ivrStep, ivrSuccess]);

  const transcriptionDone =
    phase === "analyzing" || phase === "generating" || phase === "complete";

  function primaryButtonLabel() {
    if (phase === "idle") return "Transcribe";
    if (phase === "listening" || phase === "transcribing") return "Transcribing…";
    if (emrSent) return "Sent to EMR";
    return "Send to EMR";
  }

  const showActionButtons = phase === "complete";
  const primaryButtonDisabled =
    phase === "listening" ||
    phase === "transcribing" ||
    phase === "analyzing" ||
    phase === "generating" ||
    (showActionButtons ? emrSent : false);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const phaseLabel: Record<DemoPhase, string> = {
    idle: "Ready",
    listening: "Capturing encounter audio",
    transcribing: "Live transcription",
    analyzing: "Clinical intelligence",
    generating: "Generating SOAP note",
    complete: "Documentation complete",
  };

  const audioProgress =
    phase === "listening"
      ? 0.08
      : phase === "transcribing"
        ? transcriptProgress
        : phase === "complete" || phase === "generating" || phase === "analyzing"
          ? 1
          : 0;

  return (
    <div className="portal demo-page">
      <PortalHeader
        title="AmeriWound AI"
        onLogout={handleLogout}
        dashboardHref="/ameriwound-ai/dashboard/"
        adminHref="/ameriwound-ai/admin/"
        demoHref=""
      />

      <main className="portal-main">
        <section className="portal-hero demo-hero-row">
          <div>
            <p className="demo-kicker">AmeriWound AI</p>
            <h1>WoundCare SOAP Notes</h1>
            <p>
              AmeriWound AI transcribes provider encounters and produces complete,
              audit-ready SOAP note in real time.
            </p>
          </div>
          <div className="demo-hero-actions">
            {showActionButtons ? (
              <div className="demo-hero-buttons">
                <button
                  type="button"
                  className="portal-btn portal-btn-secondary demo-shoreline-btn"
                  onClick={openShorelineModal}
                  disabled={shorelineDone}
                >
                  {shorelineDone ? "Shoreline ✓" : "Shoreline"}
                </button>
                <button
                  type="button"
                  className="portal-btn portal-btn-secondary demo-shoreline-btn"
                  onClick={openIvrModal}
                  disabled={ivrDone}
                >
                  {ivrDone ? "IVR ✓" : "Run IVR"}
                </button>
                <button
                  type="button"
                  className="portal-btn portal-btn-primary"
                  onClick={handlePrimaryAction}
                  disabled={emrSent}
                >
                  {primaryButtonLabel()}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="portal-btn portal-btn-primary"
                onClick={handlePrimaryAction}
                disabled={primaryButtonDisabled}
              >
                {primaryButtonLabel()}
              </button>
            )}
            <div className="demo-timer">
              <span>Session</span>
              <strong>{formatTime(elapsed)}</strong>
            </div>
          </div>
        </section>

        <div className="demo-status-row">
          <div className={`demo-status-pill phase-${phase}`}>
            <span className="demo-pulse" />
            {phaseLabel[phase]}
          </div>
          <div className="demo-metrics">
            <div>
              <span>Transcript lines</span>
              <strong>{visibleLines.length}</strong>
            </div>
            <div>
              <span>Words generated</span>
              <strong>{wordCount.toLocaleString()}</strong>
            </div>
            <div>
              <span>Model</span>
              <strong>AW-Clinical v2</strong>
            </div>
          </div>
        </div>

        <div className="pipeline demo-pipeline">
          {(["listening", "transcribing", "analyzing", "generating", "complete"] as DemoPhase[]).map((p, i) => {
            const order = ["listening", "transcribing", "analyzing", "generating", "complete"];
            const current = order.indexOf(phase === "idle" ? "listening" : phase);
            const idx = order.indexOf(p);
            const state = phase === "idle" ? "" : idx < current ? "done" : idx === current ? "active" : "";
            return (
              <div key={p} style={{ display: "contents" }}>
                {i > 0 && <div className={`pipeline-connector${idx <= current && phase !== "idle" ? " done" : ""}`} />}
                <div className={`pipeline-step demo-pipeline-step ${state}`} role="listitem">
                  <div className="pipeline-step-icon">{idx < current || phase === "complete" ? "✓" : i + 1}</div>
                  <span className="pipeline-step-label">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {(phase === "listening" || phase === "transcribing") && (
          <EncounterAudio
            active={phase === "listening" || phase === "transcribing"}
            progress={audioProgress}
          />
        )}

        {phase === "analyzing" && (
          <div className="portal-card demo-analysis-card">
            <div className="portal-card-header">
              <h2>Extracting clinical structure</h2>
            </div>
            <div className="portal-card-body">
              <ul className="demo-analysis-list">
                {ANALYSIS_ITEMS.map((item, i) => (
                  <li key={item} className={i < analysisStep ? "done" : i === analysisStep ? "active" : ""}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="portal-grid demo-panels">
          <section className="portal-card">
            <div className="portal-card-header">
              <h2>Live Transcript</h2>
              <span className="badge">Whisper Medical</span>
            </div>
            <div className="portal-card-body demo-transcript" ref={transcriptRef}>
              {visibleLines.length === 0 && phase === "idle" && (
                <div className="empty-state">
                  <p>Press Transcribe to begin…</p>
                </div>
              )}
              {visibleLines.map((line, i) => (
                <div
                  key={`${i}-${line.text.slice(0, 12)}`}
                  className={`demo-line demo-line--${line.speaker.toLowerCase()}${i === visibleLines.length - 1 && phase === "transcribing" ? " demo-line--latest" : ""}`}
                >
                  <span className="demo-speaker">{line.speaker}</span>
                  <p>{line.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="portal-card">
            <div className="portal-card-header">
              <h2>Wound Care SOAP Note</h2>
              <div className="demo-soap-header-actions">
                {phase === "complete" && soapText && (
                  <button
                    type="button"
                    className="portal-btn portal-btn-secondary demo-edit-btn"
                    onClick={() => setSoapEditing((e) => !e)}
                  >
                    {soapEditing ? "Done" : "Edit"}
                  </button>
                )}
                <span className="badge">
                  {phase === "generating" || phase === "complete"
                    ? activeSection || "Generating…"
                    : "Awaiting transcript"}
                </span>
              </div>
            </div>
            <div className="portal-card-body demo-soap" ref={soapRef}>
              {transcriptionDone && (
                <div className="demo-patient-bar">
                  <div className="demo-patient-bar__name">
                    <strong>PATIENT NAME: {DEMO_PATIENT_NAME}</strong>
                  </div>
                  <label className="demo-notes-history">
                    <span>Notes history</span>
                    <select
                      value={notesHistoryId}
                      onChange={(e) => setNotesHistoryId(e.target.value)}
                    >
                      {NOTES_HISTORY.map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.date} — {note.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {!soapText && (
                <div className="empty-state">
                  <p>
                    {phase === "generating" || phase === "analyzing"
                      ? "Assembling structured clinical documentation…"
                      : "Complete SOAP note will stream here after analysis…"}
                  </p>
                </div>
              )}
              {soapText && soapEditing && phase === "complete" && (
                <textarea
                  className="demo-soap-editor"
                  value={soapText}
                  onChange={(e) => {
                    setSoapText(e.target.value);
                    setWordCount(e.target.value.split(/\s+/).filter(Boolean).length);
                  }}
                  spellCheck={false}
                  aria-label="Edit wound care SOAP note"
                />
              )}
              {soapText && !(soapEditing && phase === "complete") && (
                <div className="demo-soap-content">
                  {buildSoapBlocks(soapText).map((block, i) =>
                    block.type === "text" ? (
                      <span key={`text-${i}`} className="demo-soap-text">
                        {block.text}
                      </span>
                    ) : (
                      <figure key={block.image.id} className="demo-soap-inline-image">
                        <img src={block.image.src} alt={block.image.alt} loading="lazy" />
                        <figcaption>{block.image.caption}</figcaption>
                      </figure>
                    ),
                  )}
                  {phase === "generating" && <span className="demo-cursor" />}
                </div>
              )}
            </div>
            {phase === "complete" && (
              <footer className="demo-soap-footer">0 Errors Found</footer>
            )}
          </section>
        </div>
      </main>

      {ivrModalOpen && (
        <div className="demo-modal-backdrop" role="presentation" onClick={closeIvrModal}>
          <div
            className="demo-modal demo-ivr-modal"
            role="dialog"
            aria-labelledby="ivr-modal-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ivr-modal-title">Insurance Verification (IVR)</h2>
            <p className="demo-modal__lead">
              Running eligibility and benefits verification for {DEMO_PATIENT_NAME}.
            </p>
            {!ivrSuccess ? (
              <ul className="demo-shoreline-checklist demo-ivr-checklist">
                {IVR_CHECKS.map((item, i) => (
                  <li
                    key={item}
                    className={i < ivrStep ? "done" : i === ivrStep ? "active" : ""}
                  >
                    <span className="demo-shoreline-check-icon" aria-hidden>
                      {i < ivrStep ? "✓" : i === ivrStep ? "…" : ""}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="demo-shoreline-success">
                <div className="demo-shoreline-success__ring" aria-hidden>
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" />
                    <path
                      d="M20 33l8 8 16-18"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="demo-shoreline-success__title">Verified</p>
                <p className="demo-shoreline-success__lead">
                  Medicare Part B active. Wound care and skin substitute benefits confirmed.
                </p>
              </div>
            )}
            <div className="demo-modal__actions">
              <button
                type="button"
                className="portal-btn portal-btn-primary"
                onClick={closeIvrModal}
                disabled={!ivrSuccess}
              >
                {ivrSuccess ? "Close" : "Verifying…"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shorelineModalOpen && (
        <div className="demo-modal-backdrop" role="presentation" onClick={closeShorelineModal}>
          <div
            className="demo-modal demo-shoreline-modal"
            role="dialog"
            aria-labelledby="shoreline-modal-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="demo-shoreline-brand">
              <div className="demo-shoreline-logo" aria-hidden>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.35C17.25 23.15 21 18.25 21 13V7L12 2z" />
                  <path d="M9 12l2 2 4-4" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h2 id="shoreline-modal-title">Shoreline QA Review</h2>
                <p className="demo-shoreline-subtitle">Shoreline Insurance · Medicare payment guarantee</p>
              </div>
            </div>
            {!shorelineSuccess ? (
              <>
                <p className="demo-modal__lead">
                  Running stringent documentation review against Shoreline Insurance criteria for Medicare reimbursement.
                </p>
                <ul className="demo-shoreline-checklist">
                  {SHORELINE_CHECKS.map((item, i) => (
                    <li
                      key={item}
                      className={
                        i < shorelineStep ? "done" : i === shorelineStep ? "active" : ""
                      }
                    >
                      <span className="demo-shoreline-check-icon" aria-hidden>
                        {i < shorelineStep ? "✓" : i === shorelineStep ? "…" : ""}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="demo-shoreline-success">
                <div className="demo-shoreline-success__ring" aria-hidden>
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" />
                    <path
                      d="M20 33l8 8 16-18"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="demo-shoreline-success__title">Success!</p>
                <p className="demo-shoreline-success__lead">
                  All 10 Shoreline review criteria passed. Notes are cleared for Medicare reimbursement.
                </p>
              </div>
            )}
            <div className="demo-modal__actions">
              <button
                type="button"
                className="portal-btn portal-btn-primary"
                onClick={closeShorelineModal}
                disabled={!shorelineSuccess}
              >
                {shorelineSuccess ? "Close" : "Reviewing…"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emrModalOpen && (
        <div className="demo-modal-backdrop" role="presentation" onClick={() => setEmrModalOpen(false)}>
          <div
            className="demo-modal"
            role="dialog"
            aria-labelledby="emr-modal-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="emr-modal-title">Send notes to EMR</h2>
            <p className="demo-modal__lead">
              To send notes to EMR, please provide API Key and Secret Code.
            </p>
            <form onSubmit={handleEmrSubmit} className="demo-modal__form">
              <label>
                API Key
                <input
                  type="text"
                  value={emrApiKey}
                  onChange={(e) => setEmrApiKey(e.target.value)}
                  placeholder="Enter EMR API key"
                  autoFocus
                  required
                />
              </label>
              <label>
                Secret Code
                <input
                  type="password"
                  value={emrSecret}
                  onChange={(e) => setEmrSecret(e.target.value)}
                  placeholder="Enter secret code"
                  required
                />
              </label>
              <div className="demo-modal__actions">
                <button type="button" className="portal-btn portal-btn-secondary" onClick={() => setEmrModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn portal-btn-primary">
                  Connect to EMR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
