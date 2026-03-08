"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAdminSubmissions,
  approveSubmission,
  rejectSubmission,
  type Submission,
} from "@/lib/api";
import { getExplorerTxUrl } from "@/lib/contracts";

type AdminSubmission = Submission & { x_handle: string | null };

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [processed, setProcessed] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, string>>({});

  const fetchSubmissions = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminSubmissions(key);
      setSubmissions(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    if (key) {
      setAdminKey(key);
      setAuthenticated(true);
      fetchSubmissions(key);
      window.history.replaceState({}, "", "/admin");
    }
  }, [fetchSubmissions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    setAuthenticated(true);
    fetchSubmissions(adminKey);
  };

  const handleApprove = async (sub: AdminSubmission) => {
    const score = parseInt(scores[sub.id] || "");
    if (!score || score < 10) {
      setError("Score must be at least 10");
      return;
    }
    setProcessingId(sub.id);
    setError(null);
    try {
      const result = await approveSubmission(adminKey, sub.id, score);
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      setProcessed((prev) => [result, ...prev]);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (sub: AdminSubmission) => {
    setProcessingId(sub.id);
    setError(null);
    try {
      const result = await rejectSubmission(adminKey, sub.id);
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      setProcessed((prev) => [result, ...prev]);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen noise flex items-center justify-center px-6">
        <div className="bg-grid absolute inset-0" />
        <div className="relative z-10 w-full max-w-sm">
          <div className="glow-card rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-6">Admin Login</h1>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin key"
                className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors mb-4 font-mono"
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <header className="relative z-20 border-b border-weavrn-border/50 px-6 py-4 backdrop-blur-sm bg-weavrn-dark/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="w-7 h-7" />
            <span className="text-xl font-bold gradient-text">weavrn</span>
          </a>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchSubmissions(adminKey)}
              className="text-xs text-weavrn-muted hover:text-white transition-colors font-mono"
            >
              Refresh
            </button>
            <span className="text-xs text-weavrn-muted font-mono">Admin</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-6 py-12 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">
          Pending Submissions
        </h1>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-400/60 hover:text-red-400"
            >
              dismiss
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-weavrn-muted">Loading...</p>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No pending submissions
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="glow-card rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={s.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00D4AA] hover:text-[#00F0C0] text-sm font-mono break-all"
                    >
                      {s.post_url}
                    </a>
                    <div className="flex gap-4 mt-2 text-xs text-weavrn-muted font-mono">
                      <span>
                        {s.wallet_address.slice(0, 6)}...
                        {s.wallet_address.slice(-4)}
                      </span>
                      {s.x_handle && <span>@{s.x_handle}</span>}
                      <span>
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    value={scores[s.id] || ""}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [s.id]: e.target.value,
                      }))
                    }
                    placeholder="Score (min 10)"
                    className="w-36 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs focus:outline-none focus:border-[#00D4AA]/50 transition-colors font-mono"
                  />
                  <button
                    onClick={() => handleApprove(s)}
                    disabled={processingId === s.id}
                    className="px-4 py-1.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {processingId === s.id ? "Processing..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(s)}
                    disabled={processingId === s.id}
                    className="px-4 py-1.5 border border-red-500/30 hover:border-red-500/60 text-red-400 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recently processed */}
        {processed.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-white mb-4">
              Recently Processed
            </h2>
            <div className="space-y-2">
              {processed.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 text-sm"
                >
                  <span className="font-mono text-xs text-weavrn-muted truncate flex-1 mr-4">
                    {s.post_url}
                  </span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {s.reward_amount && (
                      <span className="text-weavrn-muted font-mono text-xs">
                        {parseFloat(s.reward_amount).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        WVRN
                      </span>
                    )}
                    {s.tx_hash && (
                      <a
                        href={getExplorerTxUrl(s.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00D4AA]/60 hover:text-[#00D4AA] font-mono text-[10px]"
                      >
                        tx
                      </a>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                        s.status === "approved"
                          ? "bg-[#00D4AA]/10 text-[#00D4AA] border-[#00D4AA]/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
