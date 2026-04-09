"use client";

import { useState, useCallback } from "react";
import {
  getAdminBlocks,
  getAdminBlockDetail,
  getAdminPosts,
  deactivatePost,
  activatePost,
  settleBlock,
  getAdminDisputes,
  resolveDispute,
  getJob,
  getMockUsers,
  getMockTweets,
  getMockChannels,
  getMockVideos,
  updateMockUserBio,
  updateMockTweetMetrics,
  updateMockChannelDescription,
  updateMockVideoMetrics,
  resetMockData,
  bulkUpdateMockMetrics,
  createMockTweet,
  createMockVideo,
  getMockAutoIncrement,
  setMockAutoIncrement,
  getLinkedHandles,
  linkHandle,
  createMockUser,
  createMockChannel,
  type BlockStats,
  type BlockDetail,
  type TrackedPost,
  type Dispute,
  type Job,
  type MockUser,
  type MockTweet,
  type MockChannel,
  type MockVideo,
  type MockAutoIncrement,
  type LinkedHandle,
} from "@/lib/api";

type Tab = "blocks" | "posts" | "disputes" | "mock";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("blocks");
  const [blockStats, setBlockStats] = useState<BlockStats | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockDetail | null>(null);
  const [posts, setPosts] = useState<TrackedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlingBlock, setSettlingBlock] = useState<number | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [expandedDisputeId, setExpandedDisputeId] = useState<number | null>(null);
  const [disputeJobDetail, setDisputeJobDetail] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [mockUsers, setMockUsers] = useState<MockUser[]>([]);
  const [mockTweets, setMockTweets] = useState<MockTweet[]>([]);
  const [mockChannels, setMockChannels] = useState<MockChannel[]>([]);
  const [mockVideos, setMockVideos] = useState<MockVideo[]>([]);
  const [mockSection, setMockSection] = useState<"users" | "tweets" | "channels" | "videos">("users");
  const [editingBio, setEditingBio] = useState<string | null>(null);
  const [editBioValue, setEditBioValue] = useState("");
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [editDescValue, setEditDescValue] = useState("");
  const [mockAvailable, setMockAvailable] = useState(true);
  const [showNewTweet, setShowNewTweet] = useState(false);
  const [newTweetText, setNewTweetText] = useState("");
  const [newTweetAuthor, setNewTweetAuthor] = useState("");
  const [showNewVideo, setShowNewVideo] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoChannel, setNewVideoChannel] = useState("");
  const [autoInc, setAutoInc] = useState<MockAutoIncrement | null>(null);
  const [showAutoInc, setShowAutoInc] = useState(false);
  const [linkedHandles, setLinkedHandles] = useState<LinkedHandle[]>([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkWallet, setLinkWallet] = useState("");
  const [linkUser, setLinkUser] = useState("");
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserBio, setNewUserBio] = useState("");
  const [newUserFollowers, setNewUserFollowers] = useState("500");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelTitle, setNewChannelTitle] = useState("");
  const [newChannelHandle, setNewChannelHandle] = useState("");
  const [newChannelSubs, setNewChannelSubs] = useState("100");

  const fetchBlocks = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminBlocks(key);
      setBlockStats(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminPosts(key);
      setPosts(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDisputes = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDisputes(key);
      setDisputes(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMock = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const [users, tweets, channels, videos, ai, handles] = await Promise.all([
        getMockUsers(key),
        getMockTweets(key),
        getMockChannels(key),
        getMockVideos(key),
        getMockAutoIncrement(key),
        getLinkedHandles(key),
      ]);
      setMockUsers(users);
      setMockTweets(tweets);
      setMockChannels(channels);
      setMockVideos(videos);
      setAutoInc(ai);
      setLinkedHandles(handles);
      setMockAvailable(true);
    } catch {
      setMockAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResolve = async (disputeId: number, resolution: "completed" | "cancelled") => {
    setError(null);
    try {
      await resolveDispute(adminKey, disputeId, resolution, resolveNotes || undefined);
      setResolvingId(null);
      setResolveNotes("");
      fetchDisputes(adminKey);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    setAuthenticated(true);
    fetchBlocks(adminKey);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSelectedBlock(null);
    if (t === "blocks") fetchBlocks(adminKey);
    else if (t === "posts") fetchPosts(adminKey);
    else if (t === "disputes") fetchDisputes(adminKey);
    else if (t === "mock") fetchMock(adminKey);
  };

  const handleViewBlock = async (blockNumber: number) => {
    setError(null);
    try {
      const detail = await getAdminBlockDetail(adminKey, blockNumber);
      setSelectedBlock(detail);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleSettle = async (blockNumber: number) => {
    setSettlingBlock(blockNumber);
    setError(null);
    try {
      await settleBlock(adminKey, blockNumber);
      await fetchBlocks(adminKey);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSettlingBlock(null);
    }
  };

  const handleTogglePost = async (post: TrackedPost) => {
    setError(null);
    try {
      if (post.deactivated) {
        await activatePost(adminKey, post.id);
      } else {
        await deactivatePost(adminKey, post.id);
      }
      await fetchPosts(adminKey);
    } catch (err: unknown) {
      setError((err as Error).message);
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
                className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50 transition-colors mb-4 font-mono"
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300"
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
              onClick={() => handleTabChange("blocks")}
              className={`text-xs font-mono transition-colors ${
                tab === "blocks" ? "text-weavrn-accent" : "text-weavrn-muted hover:text-white"
              }`}
            >
              Blocks
            </button>
            <button
              onClick={() => handleTabChange("posts")}
              className={`text-xs font-mono transition-colors ${
                tab === "posts" ? "text-weavrn-accent" : "text-weavrn-muted hover:text-white"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => handleTabChange("disputes")}
              className={`text-xs font-mono transition-colors ${
                tab === "disputes" ? "text-weavrn-accent" : "text-weavrn-muted hover:text-white"
              }`}
            >
              Disputes
            </button>
            <button
              onClick={() => handleTabChange("mock")}
              className={`text-xs font-mono transition-colors ${
                tab === "mock" ? "text-weavrn-accent" : "text-weavrn-muted hover:text-white"
              }`}
            >
              Mock
            </button>
            <span className="text-xs text-weavrn-muted font-mono">Admin</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-6 py-12 max-w-4xl mx-auto">
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
        ) : tab === "blocks" ? (
          <>
            {/* Current block info */}
            {blockStats?.current_block && (
              <div className="glow-card rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Current Block: {blockStats.current_block.number}
                    </h2>
                    <p className="text-xs text-weavrn-muted font-mono mt-1">
                      Emission: {parseFloat(blockStats.current_block.emission).toLocaleString()} WVRN
                    </p>
                  </div>
                  {blockStats.current_block.number > 0 && (
                    <button
                      onClick={() => handleSettle(blockStats.current_block.number - 1)}
                      disabled={settlingBlock !== null}
                      className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {settlingBlock !== null
                        ? "Settling..."
                        : `Settle Block ${blockStats.current_block.number - 1}`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Block detail overlay */}
            {selectedBlock && (
              <div className="glow-card rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">
                    Block {selectedBlock.block_number}
                  </h2>
                  <button
                    onClick={() => setSelectedBlock(null)}
                    className="text-xs text-weavrn-muted hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
                {selectedBlock.rewards.length === 0 ? (
                  <p className="text-sm text-weavrn-muted">No rewards in this block</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBlock.rewards.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-weavrn-border/50 bg-weavrn-surface/30 text-xs font-mono"
                      >
                        <span className="text-weavrn-muted">
                          {r.wallet_address.slice(0, 6)}...{r.wallet_address.slice(-4)}
                        </span>
                        <span className="text-white">
                          Score: {r.delta_score} — {r.post_count} post
                          {r.post_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settled blocks */}
            <h2 className="text-lg font-bold text-white mb-4">Settled Blocks</h2>
            {!blockStats?.settled_blocks?.length ? (
              <div className="text-center py-16 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
                No blocks settled yet
              </div>
            ) : (
              <div className="space-y-2">
                {blockStats.settled_blocks.map((b) => (
                  <button
                    key={b.block_number}
                    onClick={() => handleViewBlock(b.block_number)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 hover:bg-weavrn-surface/60 transition-colors text-sm text-left"
                  >
                    <span className="text-white font-mono text-xs">
                      Block {b.block_number}
                    </span>
                    <span className="text-weavrn-muted font-mono text-xs">
                      {b.user_count} user{b.user_count !== 1 ? "s" : ""} — total score{" "}
                      {b.total_score}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : tab === "posts" ? (
          /* Posts tab */
          <>
            <h2 className="text-lg font-bold text-white mb-4">Tracked Posts</h2>
            {posts.length === 0 ? (
              <div className="text-center py-16 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
                No tracked posts
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30 text-sm ${
                      p.deactivated ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1 truncate mr-4">
                      <a
                        href={/^https?:\/\//.test(p.post_url) ? p.post_url : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-weavrn-accent hover:text-weavrn-accent-hover font-mono text-xs"
                      >
                        {p.post_url}
                      </a>
                      <div className="flex gap-3 mt-1 text-xs text-weavrn-muted font-mono">
                        <span>@{p.x_handle}</span>
                        <span>
                          {p.wallet_address.slice(0, 6)}...{p.wallet_address.slice(-4)}
                        </span>
                        <span>Block {p.discovered_in_block}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePost(p)}
                      className={`px-3 py-1 rounded text-[10px] font-semibold transition-all ${
                        p.deactivated
                          ? "border border-weavrn-accent/30 text-weavrn-accent hover:border-weavrn-accent/60"
                          : "border border-red-500/30 text-red-400 hover:border-red-500/60"
                      }`}
                    >
                      {p.deactivated ? "Activate" : "Deactivate"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : tab === "disputes" ? (
          /* Disputes tab */
          <>
            <h2 className="text-lg font-bold text-white mb-4">Open Disputes</h2>
            {disputes.length === 0 ? (
              <div className="text-center py-16 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
                No open disputes
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((d) => (
                  <div key={d.id} className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                    {/* Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {d.job_title || `Job #${d.job_id}`}
                          </p>
                          <p className="text-xs text-weavrn-muted font-mono mt-0.5">
                            Reported by {d.reporter_wallet?.slice(0, 6)}...{d.reporter_wallet?.slice(-4)}
                            {" · "}
                            {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                          {d.status}
                        </span>
                      </div>

                      {/* Parties */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-weavrn-dark/50 rounded-lg p-2.5">
                          <p className="text-[10px] text-weavrn-muted uppercase mb-1">Requester</p>
                          <a href={`/agents?wallet=${d.requester_wallet}`} className="text-xs font-mono text-weavrn-accent hover:underline">
                            {d.requester_wallet?.slice(0, 10)}...{d.requester_wallet?.slice(-6)}
                          </a>
                        </div>
                        <div className="bg-weavrn-dark/50 rounded-lg p-2.5">
                          <p className="text-[10px] text-weavrn-muted uppercase mb-1">Provider</p>
                          <a href={`/agents?wallet=${d.provider_wallet}`} className="text-xs font-mono text-weavrn-accent hover:underline">
                            {d.provider_wallet?.slice(0, 10)}...{d.provider_wallet?.slice(-6)}
                          </a>
                        </div>
                      </div>

                      {/* Dispute reason */}
                      <div className="mb-3">
                        <p className="text-[10px] text-weavrn-muted uppercase mb-1">Dispute Reason</p>
                        <p className="text-sm text-white/90 bg-weavrn-dark/50 p-3 rounded-lg whitespace-pre-wrap">
                          {d.reason}
                        </p>
                      </div>

                      {/* View job detail toggle */}
                      <button
                        onClick={async () => {
                          if (expandedDisputeId === d.id) {
                            setExpandedDisputeId(null);
                            setDisputeJobDetail(null);
                          } else {
                            setExpandedDisputeId(d.id);
                            setLoadingJob(true);
                            try {
                              const job = await getJob(d.job_id);
                              setDisputeJobDetail(job);
                            } catch { /* ignore */ }
                            setLoadingJob(false);
                          }
                        }}
                        className="text-xs text-weavrn-accent hover:underline mb-3"
                      >
                        {expandedDisputeId === d.id ? "Hide job details" : "View job details"}
                      </button>

                      {/* Expanded job detail */}
                      {expandedDisputeId === d.id && (
                        <div className="bg-weavrn-dark/50 rounded-lg p-3 mb-3 space-y-2">
                          {loadingJob ? (
                            <p className="text-xs text-weavrn-muted">Loading...</p>
                          ) : disputeJobDetail ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">{disputeJobDetail.status}</span>
                                <span className="text-xs text-white font-semibold">{disputeJobDetail.title}</span>
                              </div>
                              {disputeJobDetail.description && (
                                <p className="text-xs text-weavrn-muted">{disputeJobDetail.description}</p>
                              )}
                              {disputeJobDetail.escrow_id != null && (
                                <p className="text-xs text-weavrn-muted font-mono">Escrow #{disputeJobDetail.escrow_id}</p>
                              )}
                              {disputeJobDetail.deliverable_type && (() => {
                                const parsed = typeof disputeJobDetail.deliverable_data === "string"
                                  ? JSON.parse(disputeJobDetail.deliverable_data)
                                  : disputeJobDetail.deliverable_data as { content?: string };
                                const content = parsed?.content || "";
                                return (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-[10px] text-weavrn-muted uppercase">Deliverable ({disputeJobDetail.deliverable_type})</p>
                                      <button
                                        onClick={() => {
                                          const blob = new Blob([content], { type: "text/markdown" });
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = `job-${disputeJobDetail.id}-deliverable.md`;
                                          a.click();
                                          URL.revokeObjectURL(url);
                                        }}
                                        className="text-[10px] text-weavrn-accent hover:underline"
                                      >
                                        Download full
                                      </button>
                                    </div>
                                    <pre className="text-xs text-white/70 bg-black/30 rounded p-2 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                      {content.substring(0, 500)}{content.length > 500 && "..."}
                                    </pre>
                                  </div>
                                );
                              })()}
                              <p className="text-[10px] text-weavrn-muted">
                                Created {new Date(disputeJobDetail.created_at).toLocaleString()}
                                {" · "}
                                Updated {new Date(disputeJobDetail.updated_at).toLocaleString()}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-red-400">Could not load job details</p>
                          )}
                        </div>
                      )}

                      {/* Resolve actions */}
                      {resolvingId === d.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            placeholder="Admin notes — explain the decision"
                            rows={2}
                            className="w-full bg-weavrn-dark border border-weavrn-border rounded-lg p-2 text-xs text-white placeholder:text-weavrn-muted focus:border-weavrn-accent/50 focus:outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolve(d.id, "completed")}
                              className="px-3 py-1.5 rounded-lg text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                            >
                              Release to Provider
                            </button>
                            <button
                              onClick={() => handleResolve(d.id, "cancelled")}
                              className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                            >
                              Refund Requester
                            </button>
                            <button
                              onClick={() => { setResolvingId(null); setResolveNotes(""); }}
                              className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setResolvingId(d.id)}
                            className="px-4 py-2 rounded-lg text-xs bg-weavrn-accent/10 text-weavrn-accent hover:bg-weavrn-accent/20 border border-weavrn-accent/20"
                          >
                            Resolve Dispute
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const { rerunJob } = await import("@/lib/api");
                                await rerunJob(adminKey, d.job_id, `Rerun from dispute #${d.id}`);
                                alert(`Job #${d.job_id} requeued for rerun`);
                              } catch (err: unknown) {
                                alert(`Rerun failed: ${(err as Error).message}`);
                              }
                            }}
                            className="px-4 py-2 rounded-lg text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                          >
                            Rerun Job
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Mock provider tab */
          <>
            {!mockAvailable ? (
              <div className="text-center py-16 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
                Mock provider not connected. Set <code className="text-weavrn-accent">X_BASE_URL</code> in the API to enable.
              </div>
            ) : (
              <>
                {/* Controls */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Mock Provider</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await bulkUpdateMockMetrics(adminKey, { likes: 5, retweets: 2, replies: 1, views: 500 }, { views: 100, likes: 3, comments: 1 });
                          await fetchMock(adminKey);
                        } catch (err: unknown) { setError((err as Error).message); }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                    >
                      Bump Metrics
                    </button>
                    <button
                      onClick={() => setShowAutoInc(!showAutoInc)}
                      className={`px-3 py-1.5 rounded-lg text-xs border ${autoInc?.enabled ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-weavrn-surface/30 text-weavrn-muted border-weavrn-border/50"}`}
                    >
                      Auto-Increment {autoInc?.enabled ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await resetMockData(adminKey);
                          await fetchMock(adminKey);
                        } catch (err: unknown) { setError((err as Error).message); }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    >
                      Reset Data
                    </button>
                  </div>
                </div>

                {/* Auto-increment config */}
                {showAutoInc && autoInc && (
                  <div className="glow-card rounded-2xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Auto-Increment Config</h3>
                      <button
                        onClick={async () => {
                          try {
                            await setMockAutoIncrement(adminKey, { enabled: !autoInc.enabled });
                            await fetchMock(adminKey);
                          } catch (err: unknown) { setError((err as Error).message); }
                        }}
                        className={`px-3 py-1 rounded text-xs font-semibold ${autoInc.enabled ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}
                      >
                        {autoInc.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                    <p className="text-[10px] text-weavrn-muted mb-3">Each time a tweet/video is fetched, metrics bump by these deltas. Simulates organic growth between crawls.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-weavrn-muted uppercase mb-2">Tweet Deltas</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["likes", "retweets", "replies", "views"] as const).map((k) => (
                            <div key={k} className="flex items-center gap-1.5">
                              <label className="text-[10px] text-weavrn-muted w-14">{k}</label>
                              <input
                                type="number"
                                value={autoInc.tweets[k]}
                                onChange={(e) => setAutoInc({ ...autoInc, tweets: { ...autoInc.tweets, [k]: parseInt(e.target.value) || 0 } })}
                                className="w-16 px-2 py-1 bg-weavrn-dark border border-weavrn-border rounded text-xs text-white text-right focus:outline-none focus:border-weavrn-accent/50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-weavrn-muted uppercase mb-2">Video Deltas</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["views", "likes", "comments"] as const).map((k) => (
                            <div key={k} className="flex items-center gap-1.5">
                              <label className="text-[10px] text-weavrn-muted w-14">{k}</label>
                              <input
                                type="number"
                                value={autoInc.videos[k]}
                                onChange={(e) => setAutoInc({ ...autoInc, videos: { ...autoInc.videos, [k]: parseInt(e.target.value) || 0 } })}
                                className="w-16 px-2 py-1 bg-weavrn-dark border border-weavrn-border rounded text-xs text-white text-right focus:outline-none focus:border-weavrn-accent/50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await setMockAutoIncrement(adminKey, { tweets: autoInc.tweets, videos: autoInc.videos });
                          await fetchMock(adminKey);
                        } catch (err: unknown) { setError((err as Error).message); }
                      }}
                      className="mt-3 px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold"
                    >
                      Save Deltas
                    </button>
                  </div>
                )}

                {/* Section tabs */}
                <div className="flex gap-3 mb-4">
                  {(["users", "tweets", "channels", "videos"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setMockSection(s)}
                      className={`text-xs font-mono transition-colors ${
                        mockSection === s ? "text-weavrn-accent" : "text-weavrn-muted hover:text-white"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)} ({s === "users" ? mockUsers.length : s === "tweets" ? mockTweets.length : s === "channels" ? mockChannels.length : mockVideos.length})
                    </button>
                  ))}
                </div>

                {/* Wallet ↔ Handle Links */}
                <div className="mb-4 p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-white">Wallet Links ({linkedHandles.length})</h3>
                    <button
                      onClick={() => setShowLinkForm(!showLinkForm)}
                      className="text-[10px] text-weavrn-accent hover:underline"
                    >
                      {showLinkForm ? "Cancel" : "+ Link Wallet"}
                    </button>
                  </div>
                  {showLinkForm && (
                    <div className="flex gap-2 mb-2">
                      <input
                        value={linkWallet}
                        onChange={(e) => setLinkWallet(e.target.value)}
                        placeholder="0x... wallet address"
                        className="flex-1 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white font-mono placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
                      />
                      <select
                        value={linkUser}
                        onChange={(e) => setLinkUser(e.target.value)}
                        className="px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white focus:outline-none focus:border-weavrn-accent/50"
                      >
                        <option value="">X handle...</option>
                        {mockUsers.map((u) => (
                          <option key={u.username} value={u.username}>@{u.username}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!linkWallet || !linkUser) return;
                          try {
                            await linkHandle(adminKey, linkWallet, linkUser);
                            setShowLinkForm(false);
                            setLinkWallet("");
                            setLinkUser("");
                            await fetchMock(adminKey);
                          } catch (err: unknown) { setError((err as Error).message); }
                        }}
                        disabled={!linkWallet || !linkUser}
                        className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold disabled:opacity-50"
                      >
                        Link
                      </button>
                    </div>
                  )}
                  {linkedHandles.length > 0 && (
                    <div className="space-y-1">
                      {linkedHandles.map((h) => (
                        <div key={h.wallet_address} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-weavrn-muted">{h.wallet_address.slice(0, 6)}...{h.wallet_address.slice(-4)}</span>
                          <div className="flex gap-3">
                            {h.x_handle && <span className="text-weavrn-accent">@{h.x_handle}</span>}
                            {h.yt_handle && <span className="text-red-400">YT: {h.yt_handle}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Users */}
                {mockSection === "users" && (
                  <div className="space-y-2">
                    {showNewUser ? (
                      <div className="p-4 rounded-xl border border-weavrn-accent/30 bg-weavrn-surface/30 space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="username"
                            className="flex-1 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
                          />
                          <input
                            type="number"
                            value={newUserFollowers}
                            onChange={(e) => setNewUserFollowers(e.target.value)}
                            placeholder="followers"
                            className="w-24 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50 text-right"
                          />
                        </div>
                        <input
                          value={newUserBio}
                          onChange={(e) => setNewUserBio(e.target.value)}
                          placeholder="Bio"
                          className="w-full px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!newUsername) return;
                              try {
                                await createMockUser(adminKey, {
                                  id: `${1000 + mockUsers.length + 1}`,
                                  username: newUsername,
                                  bio: newUserBio,
                                  followersCount: parseInt(newUserFollowers) || 500,
                                });
                                setShowNewUser(false);
                                setNewUsername("");
                                setNewUserBio("");
                                setNewUserFollowers("500");
                                await fetchMock(adminKey);
                              } catch (err: unknown) { setError((err as Error).message); }
                            }}
                            disabled={!newUsername}
                            className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold disabled:opacity-50"
                          >
                            Create User
                          </button>
                          <button onClick={() => setShowNewUser(false)} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewUser(true)}
                        className="w-full py-2 rounded-xl border border-dashed border-weavrn-border/50 text-xs text-weavrn-muted hover:text-weavrn-accent hover:border-weavrn-accent/30 transition-colors"
                      >
                        + New User
                      </button>
                    )}

                    {mockUsers.map((u) => (
                      <div key={u.username} className="p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white font-semibold">@{u.username}</span>
                          <span className="text-xs text-weavrn-muted font-mono">{u.followersCount.toLocaleString()} followers</span>
                        </div>
                        {editingBio === u.username ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              value={editBioValue}
                              onChange={(e) => setEditBioValue(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white focus:outline-none focus:border-weavrn-accent/50"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  await updateMockUserBio(adminKey, u.username, editBioValue);
                                  setEditingBio(null);
                                  await fetchMock(adminKey);
                                } catch (err: unknown) { setError((err as Error).message); }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingBio(null)} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-weavrn-muted truncate mr-4">{u.bio}</p>
                            <button
                              onClick={() => { setEditingBio(u.username); setEditBioValue(u.bio); }}
                              className="text-[10px] text-weavrn-accent hover:underline shrink-0"
                            >
                              Edit Bio
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tweets */}
                {mockSection === "tweets" && (
                  <div className="space-y-2">
                    {/* Create tweet */}
                    {showNewTweet ? (
                      <div className="p-4 rounded-xl border border-weavrn-accent/30 bg-weavrn-surface/30 space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={newTweetAuthor}
                            onChange={(e) => setNewTweetAuthor(e.target.value)}
                            className="px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white focus:outline-none focus:border-weavrn-accent/50"
                          >
                            <option value="">Select user...</option>
                            {mockUsers.map((u) => (
                              <option key={u.username} value={u.username}>@{u.username}</option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={newTweetText}
                          onChange={(e) => setNewTweetText(e.target.value)}
                          placeholder="Tweet text (include weavrn/$WVRN/#WVRN to qualify for mining)"
                          rows={2}
                          className="w-full px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!newTweetAuthor || !newTweetText) return;
                              try {
                                await createMockTweet(adminKey, {
                                  id: `t${Date.now()}`,
                                  text: newTweetText,
                                  authorUsername: newTweetAuthor,
                                  createdAt: new Date().toISOString(),
                                  likes: 0, retweets: 0, replies: 0, views: 0,
                                });
                                setShowNewTweet(false);
                                setNewTweetText("");
                                setNewTweetAuthor("");
                                await fetchMock(adminKey);
                              } catch (err: unknown) { setError((err as Error).message); }
                            }}
                            disabled={!newTweetAuthor || !newTweetText}
                            className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold disabled:opacity-50"
                          >
                            Create Tweet
                          </button>
                          <button onClick={() => setShowNewTweet(false)} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewTweet(true)}
                        className="w-full py-2 rounded-xl border border-dashed border-weavrn-border/50 text-xs text-weavrn-muted hover:text-weavrn-accent hover:border-weavrn-accent/30 transition-colors"
                      >
                        + New Tweet
                      </button>
                    )}

                    {mockTweets.map((t) => (
                      <div key={t.id} className="p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-weavrn-accent font-mono">@{t.authorUsername}</span>
                          <span className="text-[10px] text-weavrn-muted font-mono">{t.id}</span>
                        </div>
                        <p className="text-xs text-white/80 mb-2 line-clamp-2">{t.text}</p>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-weavrn-muted">
                          <span>
                            <button onClick={async () => { await updateMockTweetMetrics(adminKey, t.id, { likes: t.likes + 10 }); fetchMock(adminKey); }} className="hover:text-white">+</button>
                            {" "}{t.likes} likes
                          </span>
                          <span>
                            <button onClick={async () => { await updateMockTweetMetrics(adminKey, t.id, { retweets: t.retweets + 5 }); fetchMock(adminKey); }} className="hover:text-white">+</button>
                            {" "}{t.retweets} RTs
                          </span>
                          <span>
                            <button onClick={async () => { await updateMockTweetMetrics(adminKey, t.id, { replies: t.replies + 3 }); fetchMock(adminKey); }} className="hover:text-white">+</button>
                            {" "}{t.replies} replies
                          </span>
                          <span>
                            <button onClick={async () => { await updateMockTweetMetrics(adminKey, t.id, { views: t.views + 1000 }); fetchMock(adminKey); }} className="hover:text-white">+</button>
                            {" "}{t.views.toLocaleString()} views
                          </span>
                          <span className="text-weavrn-accent">
                            score: {Math.floor(t.likes + t.retweets * 3 + t.replies * 2 + t.views * 0.01)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Channels */}
                {mockSection === "channels" && (
                  <div className="space-y-2">
                    {showNewChannel ? (
                      <div className="p-4 rounded-xl border border-weavrn-accent/30 bg-weavrn-surface/30 space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={newChannelTitle}
                            onChange={(e) => setNewChannelTitle(e.target.value)}
                            placeholder="Channel title"
                            className="flex-1 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
                          />
                          <input
                            value={newChannelHandle}
                            onChange={(e) => setNewChannelHandle(e.target.value)}
                            placeholder="handle"
                            className="w-32 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
                          />
                          <input
                            type="number"
                            value={newChannelSubs}
                            onChange={(e) => setNewChannelSubs(e.target.value)}
                            placeholder="subs"
                            className="w-20 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50 text-right"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!newChannelTitle || !newChannelHandle) return;
                              const id = `UC${Date.now().toString(36)}`;
                              try {
                                await createMockChannel(adminKey, {
                                  id,
                                  title: newChannelTitle,
                                  handle: newChannelHandle,
                                  customUrl: `@${newChannelHandle}`,
                                  description: "",
                                  subscriberCount: parseInt(newChannelSubs) || 100,
                                });
                                setShowNewChannel(false);
                                setNewChannelTitle("");
                                setNewChannelHandle("");
                                setNewChannelSubs("100");
                                await fetchMock(adminKey);
                              } catch (err: unknown) { setError((err as Error).message); }
                            }}
                            disabled={!newChannelTitle || !newChannelHandle}
                            className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold disabled:opacity-50"
                          >
                            Create Channel
                          </button>
                          <button onClick={() => setShowNewChannel(false)} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewChannel(true)}
                        className="w-full py-2 rounded-xl border border-dashed border-weavrn-border/50 text-xs text-weavrn-muted hover:text-weavrn-accent hover:border-weavrn-accent/30 transition-colors"
                      >
                        + New Channel
                      </button>
                    )}

                    {mockChannels.map((ch) => (
                      <div key={ch.id} className="p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white font-semibold">{ch.title}</span>
                          <span className="text-xs text-weavrn-muted font-mono">{ch.subscriberCount.toLocaleString()} subs</span>
                        </div>
                        <p className="text-xs text-weavrn-muted font-mono mb-1">@{ch.handle} · {ch.id}</p>
                        {editingDesc === ch.id ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              value={editDescValue}
                              onChange={(e) => setEditDescValue(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white focus:outline-none focus:border-weavrn-accent/50"
                            />
                            <button
                              onClick={async () => {
                                try {
                                  await updateMockChannelDescription(adminKey, ch.id, editDescValue);
                                  setEditingDesc(null);
                                  await fetchMock(adminKey);
                                } catch (err: unknown) { setError((err as Error).message); }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingDesc(null)} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-weavrn-muted truncate mr-4">{ch.description}</p>
                            <button
                              onClick={() => { setEditingDesc(ch.id); setEditDescValue(ch.description); }}
                              className="text-[10px] text-weavrn-accent hover:underline shrink-0"
                            >
                              Edit Desc
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Videos */}
                {mockSection === "videos" && (
                  <div className="space-y-2">
                    {/* Create video */}
                    {showNewVideo ? (
                      <div className="p-4 rounded-xl border border-weavrn-accent/30 bg-weavrn-surface/30 space-y-2">
                        <select
                          value={newVideoChannel}
                          onChange={(e) => setNewVideoChannel(e.target.value)}
                          className="px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white focus:outline-none focus:border-weavrn-accent/50"
                        >
                          <option value="">Select channel...</option>
                          {mockChannels.map((ch) => (
                            <option key={ch.id} value={ch.id}>{ch.title} (@{ch.handle})</option>
                          ))}
                        </select>
                        <input
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                          placeholder="Video title (include weavrn/$WVRN to qualify)"
                          className="w-full px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!newVideoChannel || !newVideoTitle) return;
                              const ch = mockChannels.find((c) => c.id === newVideoChannel);
                              try {
                                await createMockVideo(adminKey, {
                                  id: `v${Date.now()}`,
                                  title: newVideoTitle,
                                  description: newVideoTitle,
                                  channelId: newVideoChannel,
                                  channelTitle: ch?.title ?? "",
                                  publishedAt: new Date().toISOString(),
                                  views: 0, likes: 0, comments: 0,
                                });
                                setShowNewVideo(false);
                                setNewVideoTitle("");
                                setNewVideoChannel("");
                                await fetchMock(adminKey);
                              } catch (err: unknown) { setError((err as Error).message); }
                            }}
                            disabled={!newVideoChannel || !newVideoTitle}
                            className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent text-black font-semibold disabled:opacity-50"
                          >
                            Create Video
                          </button>
                          <button onClick={() => setShowNewVideo(false)} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewVideo(true)}
                        className="w-full py-2 rounded-xl border border-dashed border-weavrn-border/50 text-xs text-weavrn-muted hover:text-weavrn-accent hover:border-weavrn-accent/30 transition-colors"
                      >
                        + New Video
                      </button>
                    )}

                    {mockVideos.map((v) => (
                      <div key={v.id} className="p-4 rounded-xl border border-weavrn-border/50 bg-weavrn-surface/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-weavrn-accent font-mono">{v.channelTitle}</span>
                          <span className="text-[10px] text-weavrn-muted font-mono">{v.id}</span>
                        </div>
                        <p className="text-xs text-white/80 mb-2 line-clamp-2">{v.title}</p>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-weavrn-muted">
                          <span>
                            <button onClick={async () => { await updateMockVideoMetrics(adminKey, v.id, { views: v.views + 1000 }); fetchMock(adminKey); }} className="hover:text-white">+</button>
                            {" "}{v.views.toLocaleString()} views
                          </span>
                          <span>
                            <button onClick={async () => { await updateMockVideoMetrics(adminKey, v.id, { likes: v.likes + 10 }); fetchMock(adminKey); }} className="hover:text-white">+</button>
                            {" "}{v.likes} likes
                          </span>
                          <span>
                            <button onClick={async () => { await updateMockVideoMetrics(adminKey, v.id, { comments: v.comments + 3 }); fetchMock(adminKey); }} className="hover:text-white">+</button>
                            {" "}{v.comments} comments
                          </span>
                          <span className="text-weavrn-accent">
                            score: {Math.floor(v.likes * 5 + v.comments * 10 + v.views * 0.02)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
