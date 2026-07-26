"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed.");
        return;
      }
      router.push("/ameriwound-ai/dashboard/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-page">
      <div className="ai-card ai-login-card">
        <div className="ai-brand">
          <img
            src="/assets/wp-content/uploads/2024/11/site-logo350x100.svg"
            alt="AmeriWound"
            className="ai-logo"
          />
          <h1>AmeriWound AI</h1>
          <p>Clinical Documentation Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="ai-form">
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="ai-error">{error}</p>}
          <button type="submit" disabled={loading} className="ai-btn ai-btn-primary">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <a href="/" className="ai-back-link">
          ← Back to AmeriWound.com
        </a>
      </div>

      <style jsx global>{`
        .ai-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0a3d62 0%, #1e6fa8 50%, #2980b9 100%);
          font-family: "Montserrat", "Segoe UI", system-ui, sans-serif;
          padding: 2rem;
        }
        .ai-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          padding: 2.5rem;
          width: 100%;
          max-width: 420px;
        }
        .ai-brand {
          text-align: center;
          margin-bottom: 2rem;
        }
        .ai-logo {
          height: 48px;
          margin-bottom: 1rem;
        }
        .ai-brand h1 {
          font-size: 1.5rem;
          color: #0a3d62;
          margin: 0 0 0.25rem;
        }
        .ai-brand p {
          color: #666;
          margin: 0;
          font-size: 0.9rem;
        }
        .ai-form label {
          display: block;
          margin-bottom: 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #333;
        }
        .ai-form input {
          display: block;
          width: 100%;
          margin-top: 0.35rem;
          padding: 0.75rem 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .ai-form input:focus {
          outline: none;
          border-color: #2980b9;
          box-shadow: 0 0 0 3px rgba(41, 128, 185, 0.15);
        }
        .ai-btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .ai-btn-primary {
          width: 100%;
          background: #0a3d62;
          color: #fff;
        }
        .ai-btn-primary:hover:not(:disabled) {
          background: #0d4f7a;
        }
        .ai-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ai-error {
          color: #c0392b;
          font-size: 0.85rem;
          margin: 0 0 1rem;
        }
        .ai-back-link {
          display: block;
          text-align: center;
          margin-top: 1.5rem;
          color: #2980b9;
          text-decoration: none;
          font-size: 0.85rem;
        }
        .ai-back-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
