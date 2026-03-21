"use client";

import React, { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getAgentJobs, getAgentRequests, acceptJob, completeJob, cancelJob, disputeJob, linkJobEscrow, getListing } from "@/lib/api";
import type { Job } from "@/lib/api";
import { createEscrowETH, releaseEscrow } from "@/lib/contracts";
import ReviewForm from "./ReviewForm";
import DeliverableView from "./DeliverableView";
import JobChat from "./JobChat";

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
  awaiting_input: "bg-orange-500/10 text-orange-400",
  delivered: "bg-weavrn-accent/10 text-weavrn-accent",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-weavrn-muted/10 text-weavrn-muted",
  disputed: "bg-red-500/10 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  awaiting_input: "Needs Info",
  delivered: "Ready for Review",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function JobQueue({ walletAddress, signer, onAction }: Props) {
  const [tab, setTab] = useState<"provider" | "requester">("requester");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewingJobId, setReviewingJobId] = useState<number | null>(null);
  const [disputingJobId, setDisputingJobId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [chatJobId, setChatJobId] = useState<number | null>(null);
  const [fundingJobId, setFundingJobId] = useState<number | null>(null);
  const [fundingDetails, setFundingDetails] = useState<{ price: string; fee: string; total: string; feeModel: string; providerFee: string } | null>(null);

  const fetchJobs = useCallback(async (p: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = tab === "provider"
        ? await getAgentJobs(walletAddress, p, 20)
        : await getAgentRequests(walletAddress, p, 20);
      setJobs((prev) => {
        const newJson = JSON.stringify(res.jobs);
        const prevJson = JSON.stringify(prev);
        return newJson === prevJson ? prev : res.jobs;
      });
      setTotal(res.total);
      if (!silent) setPage(p);
    } catch {
      // ignore
    } finally {
      if (!silent) setLoading(false);
    }
  }, [walletAddress, tab]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  useEffect(() => {
    const interval = setInterval(() => fetchJobs(page, true), 5000);
    return () => clearInterval(interval);
  }, [fetchJobs, page]);

  const handleAction = async (action: string, jobId: number) => {
    if (!signer) return;
    setActing(`${action}-${jobId}`);
    setError(null);
    try {
      if (action === "accept") await acceptJob(signer, walletAddress, jobId);
      else if (action === "complete") {
        const job = jobs.find(j => j.id === jobId);
        if (job?.escrow_id) {
          try { await releaseEscrow(signer, job.escrow_id); } catch { /* already released */ }
        }
        // Retry — escrow indexer needs time to pick up the release
        for (let i = 0; i < 8; i++) {
          try {
            await completeJob(signer, walletAddress, jobId);
            break;
          } catch {
            if (i === 7) { setError("Escrow released but indexer is slow. Try Approve again in 30s."); fetchJobs(page); return; }
            await new Promise(r => setTimeout(r, 5000));
          }
        }
      }
      else if (action === "cancel") await cancelJob(signer, walletAddress, jobId);
      fetchJobs(page);
      onAction?.();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Action failed");
    } finally {
      setActing(null);
    }
  };

  const ESCROW_FEE_BPS = 50; // 0.5%

  const handleFundJob = async (job: Job) => {
    if (!job.listing_id) return;
    setError(null);
    try {
      const listing = await getListing(job.listing_id);
      const price = listing.price_amount || "0.001";
      const priceNum = parseFloat(price);
      const feeModel = listing.fee_model || "payer";

      let grossNum: number;
      let payerFee: number;
      let providerFee: number;

      if (feeModel === "payer") {
        grossNum = priceNum * 10000 / (10000 - ESCROW_FEE_BPS);
        payerFee = grossNum - priceNum;
        providerFee = 0;
      } else if (feeModel === "provider") {
        grossNum = priceNum;
        payerFee = 0;
        providerFee = priceNum * ESCROW_FEE_BPS / 10000;
      } else {
        // split
        const halfBps = ESCROW_FEE_BPS / 2;
        grossNum = priceNum * 10000 / (10000 - halfBps);
        payerFee = grossNum - priceNum;
        providerFee = priceNum * halfBps / 10000;
      }

      setFundingDetails({
        price: priceNum.toFixed(6),
        fee: payerFee > 0 ? payerFee.toFixed(6) : "0",
        total: grossNum.toFixed(6),
        feeModel,
        providerFee: providerFee > 0 ? providerFee.toFixed(6) : "0",
      });
      setFundingJobId(job.id);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to load listing");
    }
  };

  const confirmFund = async () => {
    const job = jobs.find(j => j.id === fundingJobId);
    if (!signer || !job?.listing_id || !fundingDetails) return;
    // Prevent double-funding: re-check escrow_id before creating
    if (job.escrow_id) { setError("Job already funded"); setFundingJobId(null); return; }
    setActing(`fund-${job.id}`);
    setError(null);
    try {
      const listing = await getListing(job.listing_id);
      const strategy = listing.escrow_strategy || "all_or_nothing";

      const { escrowId } = await createEscrowETH(
        signer,
        job.provider_wallet,
        fundingDetails.total,
        7 * 24 * 60 * 60,
        strategy,
        `Job #${job.id}: ${job.title}`,
        listing.escrow_strategy_address,
      );

      // Retry linking — escrow indexer polls every 30s
      for (let i = 0; i < 8; i++) {
        try {
          await linkJobEscrow(signer, walletAddress, job.id, escrowId);
          break;
        } catch {
          if (i === 7) throw new Error("Escrow created on-chain but indexer hasn't picked it up yet. Try refreshing in 30 seconds.");
          await new Promise(r => setTimeout(r, 5000));
        }
      }
      setFundingJobId(null);
      setFundingDetails(null);
      fetchJobs(page);
      onAction?.();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Funding failed");
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
            data-testid="job-tab-providing"
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${tab === "provider" ? "border-weavrn-accent text-weavrn-accent" : "border-weavrn-border text-weavrn-muted"}`}
          >
            Providing
          </button>
          <button
            onClick={() => setTab("requester")}
            data-testid="job-tab-requesting"
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
                    {STATUS_LABELS[j.status] || j.status}
                  </span>
                  {j.status === "awaiting_input" && (
                    <span className="text-[10px] text-orange-400">Agent needs more info</span>
                  )}
                  {j.queue_position && (
                    <span className="text-[10px] text-weavrn-muted">#{j.queue_position} in queue</span>
                  )}
                  <span className="text-[10px] text-weavrn-muted/60">{relativeTime(j.created_at)}</span>
                </div>
                <p className="text-sm font-semibold truncate">
                  <span className="text-weavrn-muted font-mono text-xs mr-1.5">#{j.id}</span>
                  {j.title}
                </p>
                <p className="text-xs text-weavrn-muted">
                  {tab === "provider" ? `From ${truncAddr(j.requester_wallet)}` : `To ${truncAddr(j.provider_wallet)}`}
                  {!j.escrow_id && j.status === "in_progress" && tab === "requester" && (
                    <span className="text-yellow-400 ml-2">Unfunded</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                {/* Fund button for unfunded in_progress jobs */}
                {tab === "requester" && j.status === "in_progress" && !j.escrow_id && j.listing_id && (
                  <button
                    onClick={() => handleFundJob(j)}
                    disabled={acting === `fund-${j.id}`}
                    data-testid="job-fund-btn"
                    className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold hover:bg-weavrn-accent-hover disabled:opacity-50 transition-all"
                  >
                    {acting === `fund-${j.id}` ? "Funding..." : "Fund"}
                  </button>
                )}
                {/* Funded indicator */}
                {j.escrow_id && ["in_progress", "awaiting_input", "delivered"].includes(j.status) && (
                  <span className="px-2 py-1.5 rounded-lg text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                    Escrow #{j.escrow_id}
                  </span>
                )}
                {/* Chat button for active jobs */}
                {["in_progress", "awaiting_input", "delivered"].includes(j.status) && (
                  <button
                    onClick={() => setChatJobId(chatJobId === j.id ? null : j.id)}
                    data-testid="job-chat-btn"
                    className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-surface border border-weavrn-border text-weavrn-muted hover:text-white"
                  >
                    {chatJobId === j.id ? "Close" : "Chat"}
                  </button>
                )}
                {/* Deliverable preview toggle */}
                {j.deliverable_data && ["delivered", "completed"].includes(j.status) && (
                  <button
                    onClick={() => setExpandedJobId(expandedJobId === j.id ? null : j.id)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent/10 text-weavrn-accent hover:bg-weavrn-accent/20"
                  >
                    {expandedJobId === j.id ? "Hide" : "View"}
                  </button>
                )}
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
                    data-testid="job-approve-btn"
                    className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold hover:bg-weavrn-accent-hover disabled:opacity-50 transition-all"
                  >
                    {acting === `complete-${j.id}` ? "..." : "Approve & Release"}
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
                {["in_progress", "awaiting_input", "delivered"].includes(j.status) && (
                  <button
                    onClick={() => {
                      setDisputingJobId(disputingJobId === j.id ? null : j.id);
                      setDisputeReason("");
                    }}
                    disabled={acting === `dispute-${j.id}`}
                    data-testid="job-dispute-btn"
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
            {/* Deliverable preview */}
            {expandedJobId === j.id && j.deliverable_data && j.deliverable_type && (
              <DeliverableView type={j.deliverable_type} data={j.deliverable_data} status={j.status as "delivered" | "completed" | "disputed"} jobId={j.id} walletAddress={walletAddress} signer={signer} />
            )}
            {/* Chat */}
            {chatJobId === j.id && (
              <JobChat jobId={j.id} walletAddress={walletAddress} signer={signer} />
            )}
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
            {fundingJobId === j.id && fundingDetails && (
              <div className="p-3 rounded-lg bg-weavrn-accent/5 border border-weavrn-accent/20">
                <p className="text-xs text-white font-semibold mb-2">Fund Escrow</p>
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-weavrn-muted">Service price</span>
                    <span className="text-white font-mono">{fundingDetails.price} ETH</span>
                  </div>
                  {fundingDetails.fee !== "0" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-weavrn-muted">
                        Platform fee ({fundingDetails.feeModel === "split" ? "your half, " : ""}0.{fundingDetails.feeModel === "split" ? "25" : "5"}%)
                      </span>
                      <span className="text-white font-mono">{fundingDetails.fee} ETH</span>
                    </div>
                  )}
                  {fundingDetails.providerFee !== "0" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-weavrn-muted">
                        Provider fee ({fundingDetails.feeModel === "split" ? "their half, " : ""}0.{fundingDetails.feeModel === "split" ? "25" : "5"}%)
                      </span>
                      <span className="text-weavrn-muted font-mono">-{fundingDetails.providerFee} ETH</span>
                    </div>
                  )}
                  <div className="border-t border-weavrn-border/30 pt-1 flex justify-between text-xs">
                    <span className="text-white font-semibold">You pay</span>
                    <span className="text-weavrn-accent font-mono font-semibold">{fundingDetails.total} ETH</span>
                  </div>
                </div>
                <p className="text-[10px] text-weavrn-muted mb-3">
                  {fundingDetails.feeModel === "payer"
                    ? "The 0.5% platform fee is added to your total. The provider receives the full listed price."
                    : fundingDetails.feeModel === "provider"
                    ? "The 0.5% platform fee is deducted from the provider\u2019s payout. You pay the listed price."
                    : "The 0.5% platform fee is split equally between you and the provider."
                  }
                  {" "}Funds are held in escrow until you approve the deliverable.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmFund}
                    disabled={acting === `fund-${j.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold hover:bg-weavrn-accent-hover disabled:opacity-50"
                  >
                    {acting === `fund-${j.id}` ? "Funding..." : "Confirm & Fund"}
                  </button>
                  <button
                    onClick={() => { setFundingJobId(null); setFundingDetails(null); }}
                    className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
