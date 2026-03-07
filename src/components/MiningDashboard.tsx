"use client";

import { useState, useEffect, useCallback } from "react";
import type { Submission } from "@/lib/supabase";

interface MiningDashboardProps {
  walletAddress: string;
  xHandle: string | null;
  onLinkX: (handle: string) => void;
}

export default function MiningDashboard({
  walletAddress,
  xHandle,
  onLinkX,
}: MiningDashboardProps) {
  const [handleInput, setHandleInput] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/rewards?wallet=${encodeURIComponent(walletAddress)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) fetchSubmissions();
  }, [walletAddress, fetchSubmissions]);

  const handleLinkX = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = handleInput.replace(/^@/, "").trim();
    if (cleaned) onLinkX(cleaned);
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl.trim() || !xHandle) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          x_handle: xHandle,
          post_url: postUrl.trim(),
        }),
      });
      if (res.ok) {
        setPostUrl("");
        fetchSubmissions();
      } else {
        const data = await res.json();
        alert(data.error || "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalEarned = submissions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + (s.reward_amount ?? 0), 0);

  if (!xHandle) {
    return (
      <div className="max-w-md mx-auto">
        <div className="glow-card rounded-2xl p-8">
          <h3 className="text-lg font-bold text-white mb-2">Link your X account</h3>
          <p className="text-sm text-weavrn-muted mb-6">
            Connect your X handle to start submitting content.
          </p>
          <form onSubmit={handleLinkX} className="flex gap-2">
            <input
              type="text"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder="@yourhandle"
              className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors placeholder:text-weavrn-muted/50"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300"
            >
              Link
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: submissions.length, label: "Submissions" },
          { value: submissions.filter((s) => s.status === "approved").length, label: "Approved" },
          { value: totalEarned.toLocaleString(), label: "WVRN Earned", highlight: true },
        ].map((stat) => (
          <div key={stat.label} className="glow-card rounded-xl p-5 text-center">
            <div className={`text-2xl font-bold ${stat.highlight ? "gradient-text" : "text-white"}`}>
              {stat.value}
            </div>
            <div className="text-xs text-weavrn-muted font-mono mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Submit post */}
      <div className="glow-card rounded-2xl p-8">
        <h3 className="text-lg font-bold text-white mb-2">Submit a Post</h3>
        <p className="text-sm text-weavrn-muted mb-5">
          Share content about AI agents, DeFi, or Weavrn on X and submit the
          URL. Max 3 per day.
        </p>
        <form onSubmit={handleSubmitPost} className="flex gap-2">
          <input
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://x.com/yourhandle/status/..."
            required
            className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors font-mono text-xs placeholder:text-weavrn-muted/50"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            {submitting ? "..." : "Submit"}
          </button>
        </form>
      </div>

      {/* Submissions list */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Your Submissions</h3>
        {loading ? (
          <p className="text-sm text-weavrn-muted">Loading...</p>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
            No submissions yet. Share something on X to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 hover:bg-weavrn-surface/60 transition-colors text-sm"
              >
                <div className="flex-1 truncate mr-4">
                  <a
                    href={s.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00D4AA] hover:text-[#00F0C0] transition-colors font-mono text-xs"
                  >
                    {s.post_url}
                  </a>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {s.reward_amount != null && (
                    <span className="text-weavrn-muted font-mono text-xs">
                      {s.reward_amount.toLocaleString()} WVRN
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                      s.status === "approved"
                        ? "bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20"
                        : s.status === "rejected"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
