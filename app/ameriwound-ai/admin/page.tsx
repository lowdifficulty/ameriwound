"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "../components/PortalHeader";
import "./admin.css";

interface KnowledgeHistoryEntry {
  title: string;
  content: string;
  savedAt: string;
}

interface KnowledgeDump {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  history: KnowledgeHistoryEntry[];
  trainedAt: string | null;
}

const LEARN_DURATION_MS = 8000;

export default function AdminPage() {
  const router = useRouter();
  const [dumps, setDumps] = useState<KnowledgeDump[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [learningId, setLearningId] = useState<string | null>(null);
  const [learnProgress, setLearnProgress] = useState(0);

  async function loadDumps() {
    const res = await fetch("/api/admin/knowledge");
    if (res.ok) {
      const data = await res.json();
      setDumps(data.dumps);
    }
  }

  useEffect(() => {
    loadDumps();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/ameriwound-ai/");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Failed to add knowledge dump.");
        return;
      }

      setTitle("");
      setContent("");
      setStatus("Knowledge dump added.");
      await loadDumps();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(dump: KnowledgeDump) {
    setEditingId(dump.id);
    setEditTitle(dump.title);
    setEditContent(dump.content);
    setExpandedHistory(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, title: editTitle, content: editContent }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Failed to save changes.");
        return;
      }

      setStatus("Knowledge dump updated.");
      cancelEdit();
      await loadDumps();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this knowledge dump?")) return;
    await fetch(`/api/admin/knowledge?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (editingId === id) cancelEdit();
    await loadDumps();
  }

  async function handleLearn(id: string) {
    setLearningId(id);
    setLearnProgress(0);
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - start;
        setLearnProgress(Math.min(100, (elapsed / LEARN_DURATION_MS) * 100));
        if (elapsed < LEARN_DURATION_MS) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      tick();
    });

    await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "learn", id }),
    });

    setLearningId(null);
    setLearnProgress(0);
    setStatus("Agent trained on knowledge dump.");
    await loadDumps();
  }

  return (
    <div className="portal">
      <PortalHeader
        title="Knowledge Base Admin"
        onLogout={handleLogout}
        dashboardHref="/ameriwound-ai/dashboard/"
        adminHref=""
      />

      <main className="portal-main">
        <div className="portal-hero">
          <h1>Knowledge Base Admin</h1>
          <p className="kb-sub">
            Add, edit, and train the agent on clinical knowledge dumps used during note generation.
          </p>
        </div>

        <div className="kb-grid">
          <section className="kb-panel">
            <h2>Add Knowledge Dump</h2>
            <form onSubmit={handleAdd} className="kb-form">
              <label>
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pressure Injury Staging Guidelines"
                  required
                />
              </label>
              <label>
                Content
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste clinical guidelines, templates, protocols…"
                  rows={10}
                  required
                />
              </label>
              <button type="submit" disabled={loading} className="portal-btn portal-btn-primary">
                {loading ? "Adding…" : "Add Knowledge Dump"}
              </button>
              {status && <p className="kb-status">{status}</p>}
            </form>
          </section>

          <section className="kb-panel">
            <h2>Existing Knowledge ({dumps.length})</h2>
            {dumps.length === 0 ? (
              <p className="kb-empty">No knowledge dumps yet.</p>
            ) : (
              <div className="kb-dump-list">
                {dumps.map((dump) => (
                  <article key={dump.id} className="kb-dump-item">
                    {editingId === dump.id ? (
                      <form onSubmit={handleSaveEdit} className="kb-form">
                        <label>
                          Title
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Content
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={12}
                            required
                          />
                        </label>
                        <div className="kb-dump-actions">
                          <button type="submit" className="portal-btn portal-btn-primary" disabled={loading}>
                            Save Changes
                          </button>
                          <button type="button" className="portal-btn portal-btn-secondary" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="kb-dump-header">
                          <div>
                            <strong>{dump.title}</strong>
                            {dump.trainedAt && (
                              <span className="kb-trained-badge">Trained {new Date(dump.trainedAt).toLocaleString()}</span>
                            )}
                          </div>
                          <div className="kb-dump-actions">
                            <button type="button" className="kb-btn-learn" onClick={() => handleLearn(dump.id)} disabled={!!learningId}>
                              Learn
                            </button>
                            <button type="button" className="portal-btn portal-btn-secondary kb-btn-small" onClick={() => startEdit(dump)}>
                              Edit
                            </button>
                            <button type="button" className="kb-btn-danger" onClick={() => handleDelete(dump.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="kb-dump-preview">
                          {dump.content.slice(0, 220)}
                          {dump.content.length > 220 ? "…" : ""}
                        </p>
                        <div className="kb-dump-meta">
                          <span>Updated {new Date(dump.updatedAt).toLocaleString()}</span>
                          {dump.history.length > 0 && (
                            <button
                              type="button"
                              className="kb-history-toggle"
                              onClick={() => setExpandedHistory(expandedHistory === dump.id ? null : dump.id)}
                            >
                              {expandedHistory === dump.id ? "Hide" : "Show"} history ({dump.history.length})
                            </button>
                          )}
                        </div>
                        {expandedHistory === dump.id && (
                          <ul className="kb-history-list">
                            {dump.history.map((entry, i) => (
                              <li key={`${entry.savedAt}-${i}`}>
                                <div className="kb-history-head">
                                  <strong>{entry.title}</strong>
                                  <span>{new Date(entry.savedAt).toLocaleString()}</span>
                                </div>
                                <p>{entry.content.slice(0, 180)}{entry.content.length > 180 ? "…" : ""}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {learningId && (
        <div className="kb-learn-overlay" role="status" aria-live="polite">
          <div className="kb-learn-card">
            <div className="kb-learn-orbit">
              <span className="kb-learn-orbit__ring" />
              <span className="kb-learn-orbit__core" />
            </div>
            <h3>Training agent…</h3>
            <p>Ingesting knowledge dump into AW-Clinical context</p>
            <div className="kb-learn-progress">
              <div className="kb-learn-progress__bar" style={{ width: `${learnProgress}%` }} />
            </div>
            <span className="kb-learn-percent">{Math.round(learnProgress)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
