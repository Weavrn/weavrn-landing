"use client";

import React, { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getAgentJobs, getAgentRequests, acceptJob, completeJob, cancelJob, disputeJob } from "@/lib/api";
import type { Job } from "@/lib/api";
import ReviewForm from "./ReviewForm";

interface Props {
  walletAddress: string;
  signer: JsonRpcSigner | null;
  onAction?: () => void;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  accepted: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-400",
  delivered: "bg-weavrn-accent/10 text-weavrn-accent",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-weavrn-muted/10 text-weavrn-muted",
  disputed: "bg-red-500/10 text-red-400",
};

export default function JobQueue({ walletAddress, signer, onAction }: Props) {
  const [tab, setTab] = useState<"provider" | "requester">("provider");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewingJobId, setReviewingJobId] = useState<number | null>(null);
  const [disputingJobId, setDisputingJobId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const fetchJobs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = tab === "provider"
        ? await getAgentJobs(walletAddress, p, 20)
        : await getAgentRequests(walletAddress, p, 20);
      setJobs(res.jobs);
      setTotal(res.total);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [walletAddress, tab]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  const handleAction = async (action: string, jobId: number) => {
    if (!signer) return;
    setActing(`${action}-${jobId}`);
    setError(null);
    try {
      if (action === "accept") await acceptJob(signer, walletAddress, jobId);
      else if (action === "complete") await completeJob(signer, walletAddress, jobId);
      else if (action === "cancel") await cancelJob(signer, walletAddress, jobId);
      fetchJobs(page);
      onAction?.();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Action failed");
    } finally {
      setActing(null);
    }
  };

  const handleDispute = async (jobId: number) => {
    if (!signer || !disputeReason.trim()) return;
    setActing(`dispute-${jobId}`);
    setError(null);
    try {
      await disputeJob(signer, walletAddress, jobId, disputeReason.trim());
      setDisputingJobId(null);
      setDisputeReason("");
      fetchJobs(page);
      onAction?.();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Dispute failed");
    } finally {
      setActing(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="glow-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Jobs</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setTab("provider")}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${tab === "provider" ? "border-weavrn-accent text-weavrn-accent" : "border-weavrn-border text-weavrn-muted"}`}
          >
            Providing
          </button>
          <button
            onClick={() => setTab("requester")}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${tab === "requester" ? "border-weavrn-accent text-weavrn-accent" : "border-weavrn-border text-weavrn-muted"}`}
          >
            Requesting
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-weavrn-muted py-4">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-weavrn-muted py-4">No jobs found</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <React.Fragment key={j.id}>
            <div className="flex items-center justify-between p-3 rounded-lg bg-weavrn-dark border border-weavrn-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[j.status] || ""}`}>
                    {j.status.replace(/_/g, " ")}
                  </span>
                  {j.queue_position && (
                    <span className="text-[10px] text-weavrn-muted">#{j.queue_position} in queue</span>
                  )}
                </div>
                <p className="text-sm font-semibold truncate">{j.title}</p>
                <p className="text-xs text-weavrn-muted">
                  {tab === "provider" ? `From ${truncAddr(j.requester_wallet)}` : `To ${truncAddr(j.provider_wallet)}`}
                </p>
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                {tab === "provider" && j.status === "pending" && (
                  <button
                    onClick={() => handleAction("accept", j.id)}
                    disabled={acting === `accept-${j.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent/10 text-weavrn-accent hover:bg-weavrn-accent/20 disabled:opacity-50"
                  >
                    {acting === `accept-${j.id}` ? "..." : "Accept"}
                  </button>
                )}
                {tab === "requester" && j.status === "delivered" && (
                  <button
                    onClick={() => handleAction("complete", j.id)}
                    disabled={acting === `complete-${j.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                  >
                    {acting === `complete-${j.id}` ? "..." : "Approve"}
                  </button>
                )}
                {["pending", "accepted"].includes(j.status) && (
                  <button
                    onClick={() => handleAction("cancel", j.id)}
                    disabled={acting === `cancel-${j.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {acting === `cancel-${j.id}` ? "..." : "Cancel"}
                  </button>
                )}
                {["in_progress", "delivered"].includes(j.status) && (
                  <button
                    onClick={() => {
                      setDisputingJobId(disputingJobId === j.id ? null : j.id);
                      setDisputeReason("");
                    }}
                    disabled={acting === `dispute-${j.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {acting === `dispute-${j.id}` ? "..." : "Dispute"}
                  </button>
                )}
                {j.status === "completed" && (
                  <button
                    onClick={() => setReviewingJobId(reviewingJobId === j.id ? null : j.id)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                  >
                    {reviewingJobId === j.id ? "Close" : "Review"}
                  </button>
                )}
              </div>
            </div>
            {reviewingJobId === j.id && (
              <ReviewForm
                jobId={j.id}
                walletAddress={walletAddress}
                signer={signer}
                onSubmitted={() => {
                  setReviewingJobId(null);
                  fetchJobs(page);
                }}
              />
            )}
            {disputingJobId === j.id && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-xs text-red-400 mb-2">Describe the issue:</p>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="What went wrong?"
                  rows={2}
                  className="w-full bg-weavrn-dark border border-weavrn-border rounded-lg p-2 text-xs text-white placeholder:text-weavrn-muted focus:border-red-500/50 focus:outline-none resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleDispute(j.id)}
                    disabled={!disputeReason.trim() || acting === `dispute-${j.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    Submit Dispute
                  </button>
                  <button
                    onClick={() => { setDisputingJobId(null); setDisputeReason(""); }}
                    className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => fetchJobs(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30">Prev</button>
          <span className="text-xs text-weavrn-muted">{page} / {totalPages}</span>
          <button onClick={() => fetchJobs(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
