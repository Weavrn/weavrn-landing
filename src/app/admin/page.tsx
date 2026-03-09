"use client";

import { useState, useCallback } from "react";
import {
  getAdminBlocks,
  getAdminBlockDetail,
  getAdminPosts,
  deactivatePost,
  activatePost,
  settleBlock,
  type BlockStats,
  type BlockDetail,
  type TrackedPost,
} from "@/lib/api";

type Tab = "blocks" | "posts";

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
    else fetchPosts(adminKey);
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
              onClick={() => handleTabChange("blocks")}
              className={`text-xs font-mono transition-colors ${
                tab === "blocks" ? "text-[#00D4AA]" : "text-weavrn-muted hover:text-white"
              }`}
            >
              Blocks
            </button>
            <button
              onClick={() => handleTabChange("posts")}
              className={`text-xs font-mono transition-colors ${
                tab === "posts" ? "text-[#00D4AA]" : "text-weavrn-muted hover:text-white"
              }`}
            >
              Posts
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
                      className="px-4 py-2 bg-[#00D4AA] hover:bg-[#00F0C0] text-black rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
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
        ) : (
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
                        href={p.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00D4AA] hover:text-[#00F0C0] font-mono text-xs"
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
                          ? "border border-[#00D4AA]/30 text-[#00D4AA] hover:border-[#00D4AA]/60"
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
        )}
      </div>
    </main>
  );
}
