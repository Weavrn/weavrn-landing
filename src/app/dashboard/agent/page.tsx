"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAgentJobs, getAgentListings, getAgent } from "@/lib/api";
import type { Job, ServiceListing } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import DeliverableView from "@/components/DeliverableView";
import JobChat from "@/components/JobChat";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  accepted: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-400",
  awaiting_input: "bg-orange-500/10 text-orange-400",
  delivered: "bg-cyan-500/10 text-cyan-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-weavrn-muted/10 text-weavrn-muted",
  disputed: "bg-red-500/10 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", accepted: "Accepted", in_progress: "In Progress",
  awaiting_input: "Needs Input", delivered: "Delivered", completed: "Completed",
  cancelled: "Cancelled", disputed: "Disputed",
};

function truncAddr(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function AgentDetailContent() {
  const searchParams = useSearchParams();
  const wallet = searchParams.get("wallet");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobPage, setJobPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [agentInfo, setAgentInfo] = useState<{ name?: string; avg_rating?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [chatJob, setChatJob] = useState<number | null>(null);

  const fetchJobs = useCallback(async (page: number, status?: string) => {
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return;
    try {
      const res = await getAgentJobs(wallet, page, 20, status || undefined);
      setJobs(res.jobs);
      setJobTotal(res.total);
      setJobPage(page);
    } catch { /* ignore */ }
  }, [wallet]);

  const fetchData = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const [jobRes, listingRes, agent] = await Promise.all([
        getAgentJobs(wallet, 1, 20).catch(() => ({ jobs: [], total: 0 })),
        getAgentListings(wallet, 1, 50).catch(() => ({ listings: [] })),
        getAgent(wallet).catch(() => null),
      ]);
      setJobs(jobRes.jobs);
      setJobTotal(jobRes.total);
      setListings(listingRes.listings || []);
      if (agent) setAgentInfo({ name: agent.name, avg_rating: agent.avg_rating });
    } catch { /* ignore */ }
    setLoading(false);
  }, [wallet]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh jobs every 10s
  useEffect(() => {
    const id = setInterval(() => fetchJobs(jobPage, statusFilter), 10000);
    return () => clearInterval(id);
  }, [fetchJobs, jobPage, statusFilter]);

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return <p className="text-center text-weavrn-muted py-20">No agent wallet specified.</p>;
  if (loading) return <p className="text-center text-weavrn-muted py-20">Loading...</p>;

  const stats = {
    total: jobTotal,
    completed: jobs.filter(j => j.status === "completed").length,
    delivered: jobs.filter(j => j.status === "delivered").length,
    inProgress: jobs.filter(j => ["in_progress", "awaiting_input"].includes(j.status)).length,
    prs: jobs.filter(j => (j.deliverable_data as { pr_url?: string } | null)?.pr_url).length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <a href="/dashboard" className="text-xs text-weavrn-accent hover:underline mb-4 inline-block">&larr; Back to Dashboard</a>
        <h1 className="text-2xl font-bold">
          Agent <span className="font-mono text-weavrn-accent">{truncAddr(wallet)}</span>
        </h1>
        {agentInfo && (
          <p className="text-sm text-weavrn-muted mt-1">
            {agentInfo.name || "Hosted Agent"} · {agentInfo.avg_rating ? `${agentInfo.avg_rating}/5` : "No ratings"}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Jobs", value: stats.total },
          { label: "Completed", value: stats.completed },
          { label: "Delivered", value: stats.delivered },
          { label: "In Progress", value: stats.inProgress },
          { label: "PRs Opened", value: stats.prs },
        ].map(s => (
          <div key={s.label} className="glow-card rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-weavrn-muted uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Listings */}
      {listings.length > 0 && (
        <div className="glow-card rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Listings</h2>
          <div className="space-y-2">
            {listings.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-weavrn-border/20 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{l.title}</p>
                  <p className="text-[10px] text-weavrn-muted">{l.category} · {l.price_amount} {l.price_token} · {l.escrow_strategy?.replace(/_/g, " ")}</p>
                </div>
                <a href={`/marketplace?id=${l.id}`} className="text-xs text-weavrn-accent hover:underline ml-3 shrink-0">View</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs */}
      <div className="glow-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Jobs ({jobTotal})</h2>
          <div className="flex gap-1">
            {["", "in_progress", "delivered", "completed", "disputed"].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); fetchJobs(1, s); }}
                className={`px-2 py-1 rounded text-[10px] transition-colors ${statusFilter === s ? "bg-weavrn-accent text-black" : "bg-weavrn-surface text-weavrn-muted hover:text-white"}`}>
                {s ? STATUS_LABELS[s] || s : "All"}
              </button>
            ))}
          </div>
        </div>

        {jobs.length === 0 ? (
          <p className="text-xs text-weavrn-muted py-4 text-center">No jobs found.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map(j => {
              const dd = (j.deliverable_data || {}) as { pr_url?: string; has_bundle?: boolean; proof?: { total_files?: number } };
              const ps = j.processing_status;
              const isActive = ps && ["preflight", "container"].includes(ps.stage);
              return (
                <div key={j.id} className="rounded-lg bg-weavrn-dark border border-weavrn-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLORS[j.status]}`}>
                        {STATUS_LABELS[j.status] || j.status}
                      </span>
                      <span className="text-sm font-semibold truncate">
                        <span className="text-weavrn-muted font-mono text-xs mr-1">#{j.id}</span>
                        {j.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-weavrn-muted shrink-0 ml-2">{relativeTime(j.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-weavrn-muted">
                    <span>From {truncAddr(j.requester_wallet)}</span>
                    {j.escrow_id && <span className="text-[10px]">Escrow #{j.escrow_id}</span>}
                    {isActive && ps.turn ? <span className="font-mono text-weavrn-accent">{ps.turn}/{ps.max_turns || 30}</span> : null}
                    {isActive && ps.activity ? <span className="truncate max-w-[200px] text-[10px]">{ps.activity}</span> : null}
                  </div>

                  {/* Progress bar for active jobs */}
                  {isActive && (
                    <div className="mt-2 h-1 bg-weavrn-border/30 rounded-full overflow-hidden">
                      <div className="h-full bg-weavrn-accent/70 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(95, Math.round(((ps.turn || 0) / (ps.max_turns || 30)) * 100))}%` }} />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    {dd.pr_url && (
                      <a href={dd.pr_url && /^https?:\/\//.test(dd.pr_url) ? dd.pr_url : '#'} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20">
                        View PR
                      </a>
                    )}
                    {["delivered", "completed"].includes(j.status) && j.deliverable_data && (
                      <button onClick={() => setExpandedJob(expandedJob === j.id ? null : j.id)}
                        className="text-[10px] px-2 py-1 rounded bg-weavrn-accent/10 text-weavrn-accent hover:bg-weavrn-accent/20">
                        {expandedJob === j.id ? "Hide" : "View"} Deliverable
                      </button>
                    )}
                    <button onClick={() => setChatJob(chatJob === j.id ? null : j.id)}
                      className="text-[10px] px-2 py-1 rounded bg-weavrn-surface text-weavrn-muted hover:text-white">
                      {chatJob === j.id ? "Hide" : "View"} Chat
                    </button>
                  </div>

                  {/* Expanded deliverable */}
                  {expandedJob === j.id && j.deliverable_data && j.deliverable_type && (
                    <div className="mt-3">
                      <DeliverableView type={j.deliverable_type} data={j.deliverable_data} status={j.status as "delivered" | "completed" | "disputed"} jobId={j.id} />
                    </div>
                  )}

                  {/* Chat */}
                  {chatJob === j.id && (
                    <div className="mt-3">
                      <JobChat jobId={j.id} walletAddress={j.requester_wallet} signer={null} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {jobTotal > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => fetchJobs(jobPage - 1, statusFilter)} disabled={jobPage <= 1}
              className="px-3 py-1 text-xs border border-weavrn-border rounded disabled:opacity-30">Prev</button>
            <span className="text-xs text-weavrn-muted py-1">Page {jobPage} of {Math.ceil(jobTotal / 20)}</span>
            <button onClick={() => fetchJobs(jobPage + 1, statusFilter)} disabled={jobPage >= Math.ceil(jobTotal / 20)}
              className="px-3 py-1 text-xs border border-weavrn-border rounded disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />
      <AppHeader showWallet={false} />
      <div className="relative z-10 px-6 py-16">
        <Suspense fallback={<p className="text-center text-weavrn-muted py-20">Loading...</p>}>
          <AgentDetailContent />
        </Suspense>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}
