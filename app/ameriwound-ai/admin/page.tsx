"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface KnowledgeDump {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [dumps, setDumps] = useState<KnowledgeDump[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this knowledge dump?")) return;
    await fetch(`/api/admin/knowledge?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadDumps();
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
          <span>AmeriWound AI — Admin</span>
        </div>
        <nav className="ai-dash-nav">
          <Link href="/ameriwound-ai/dashboard/">Dashboard</Link>
          <button onClick={handleLogout} className="ai-btn ai-btn-ghost">
            Sign Out
          </button>
        </nav>
      </header>

      <main className="ai-dash-main">
        <h1>Knowledge Base Admin</h1>
        <p className="ai-dash-sub">
          Add clinical knowledge dumps to improve wound care note generation.
          These guidelines are included as context when generating notes.
        </p>

        <div className="ai-dash-grid">
          <section className="ai-panel">
            <h2>Add Knowledge Dump</h2>
            <form onSubmit={handleAdd} className="ai-admin-form">
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
              <button
                type="submit"
                disabled={loading}
                className="ai-btn ai-btn-primary"
              >
                {loading ? "Adding…" : "Add Knowledge Dump"}
              </button>
              {status && <p className="ai-status">{status}</p>}
            </form>
          </section>

          <section className="ai-panel">
            <h2>Existing Knowledge ({dumps.length})</h2>
            {dumps.length === 0 ? (
              <p className="ai-empty">No knowledge dumps yet.</p>
            ) : (
              <div className="ai-dump-list">
                {dumps.map((dump) => (
                  <div key={dump.id} className="ai-dump-item">
                    <div className="ai-dump-header">
                      <strong>{dump.title}</strong>
                      <button
                        onClick={() => handleDelete(dump.id)}
                        className="ai-btn ai-btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="ai-dump-preview">
                      {dump.content.slice(0, 200)}
                      {dump.content.length > 200 ? "…" : ""}
                    </p>
                    <span className="ai-dump-date">
                      {new Date(dump.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
        .ai-admin-form label {
          display: block;
          margin-bottom: 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #333;
        }
        .ai-admin-form input,
        .ai-admin-form textarea {
          display: block;
          width: 100%;
          margin-top: 0.35rem;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          box-sizing: border-box;
        }
        .ai-btn {
          display: inline-block;
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
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
        }
        .ai-btn-ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .ai-btn-danger {
          background: #c0392b;
          color: #fff;
          padding: 0.3rem 0.6rem;
          font-size: 0.75rem;
        }
        .ai-status {
          margin-top: 1rem;
          font-size: 0.85rem;
          color: #2980b9;
        }
        .ai-empty {
          color: #999;
          font-size: 0.9rem;
        }
        .ai-dump-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ai-dump-item {
          padding: 1rem;
          border: 1px solid #eee;
          border-radius: 8px;
        }
        .ai-dump-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .ai-dump-preview {
          font-size: 0.85rem;
          color: #666;
          margin: 0 0 0.5rem;
          line-height: 1.4;
        }
        .ai-dump-date {
          font-size: 0.75rem;
          color: #999;
        }
      `}</style>
    </div>
  );
}
