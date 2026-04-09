"use client";

import React, { memo, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  getRewards,
  getPostBlockHistory,
  type TrackedPost,
  type TrackedPostsPagination,
  type PostBlockHistory,
} from "@/lib/api";
import ScoreBreakdown from "../ScoreBreakdown";
import PlatformFilter from "../PlatformFilter";
import RefreshButton from "./RefreshButton";

const fmtWvrn = (n: number) =>
  Number(n.toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getLatestDelta(blockHistory: Array<{ delta: number }>): number | null {
  if (!blockHistory.length) return null;
  return blockHistory[blockHistory.length - 1].delta;
}

function EngagementStat({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-weavrn-muted">
      <span className="text-weavrn-muted/50">{icon}</span>
      {value}
    </span>
  );
}

function PostTrendChip({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  const cfg = delta > 0
    ? { label: "\u2191", cls: "text-emerald-400" }
    : delta < 0
    ? { label: "\u2193", cls: "text-red-400" }
    : { label: "\u2013", cls: "text-weavrn-muted/40" };
  return <span className={`text-xs font-mono ${cfg.cls}`}>{cfg.label}</span>;
}

function PostHistoryPanel({
  postId,
  walletAddress,
  isYouTube,
  estimatedWvrn,
}: {
  postId: number;
  walletAddress: string;
  isYouTube: boolean;
  estimatedWvrn: number;
}) {
  const [history, setHistory] = useState<PostBlockHistory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [sortCol, setSortCol] = useState<keyof PostBlockHistory | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchPage = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const res = await getPostBlockHistory(walletAddress, postId, { page: p, limit: 10 });
      setHistory(res.history);
      setPage(res.page);
      setTotalPages(res.total_pages);
    } catch {
      // treat 404 (post not owned / not found) as empty history
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, postId]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  if (isLoading && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <svg className="w-4 h-4 animate-spin text-weavrn-accent" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!isLoading && history.length === 0) {
    return <p className="text-xs text-weavrn-muted text-center py-3">No block history yet</p>;
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0F]/60 rounded backdrop-blur-[1px]">
          <svg className="w-4 h-4 animate-spin text-weavrn-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="text-weavrn-muted border-b border-weavrn-border/20">
              {([
                { col: "block_number" as keyof PostBlockHistory, label: "Block", align: "left" },
                { col: "likes" as keyof PostBlockHistory, label: "Likes" },
                ...(!isYouTube ? [{ col: "retweets" as keyof PostBlockHistory, label: "RTs" }] : []),
                { col: "replies" as keyof PostBlockHistory, label: isYouTube ? "Comments" : "Replies" },
                { col: "views" as keyof PostBlockHistory, label: "Views" },
                { col: "raw_score" as keyof PostBlockHistory, label: "Score" },
                { col: "delta" as keyof PostBlockHistory, label: "Delta" },
                { col: "earned" as keyof PostBlockHistory, label: "WVRN" },
              ] as { col: keyof PostBlockHistory; label: string; align?: string }[]).map(h => {
                const active = sortCol === h.col;
                return (
                  <th key={h.col} className={`py-1.5 ${h.align === "left" ? "pr-3 text-left" : "px-2 text-right"}`}
                    aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                    <button onClick={() => { if (sortCol === h.col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(h.col); setSortDir("asc"); } }}
                      className={`hover:text-white transition-colors ${active ? "text-white" : ""}`}>
                      {h.label}{active && <span className="ml-0.5">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[...history].sort((a, b) => {
              if (!sortCol) return a.block_number - b.block_number;
              const av = a[sortCol]; const bv = b[sortCol];
              return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
            }).map((b) => (
              <tr key={b.block_number} className="text-weavrn-muted/80 border-b border-weavrn-border/10">
                <td className="py-1.5 pr-3 text-white">{b.block_number}</td>
                <td className="text-right py-1.5 px-2">{b.likes}</td>
                {!isYouTube && <td className="text-right py-1.5 px-2">{b.retweets}</td>}
                <td className="text-right py-1.5 px-2">{b.replies}</td>
                <td className="text-right py-1.5 px-2">{b.views.toLocaleString()}</td>
                <td className="text-right py-1.5 px-2">{b.raw_score}</td>
                <td className="text-right py-1.5 px-2">{b.delta}</td>
                <td className="text-right py-1.5 pl-2 text-weavrn-accent">{fmtWvrn(b.earned)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-weavrn-border/30 text-white font-medium">
              <td className="py-1.5 pr-3" colSpan={isYouTube ? 6 : 7}>Total</td>
              <td className="text-right py-1.5 pl-2 text-weavrn-accent">{fmtWvrn(estimatedWvrn)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => fetchPage(page - 1)}
            disabled={page === 1 || isLoading}
            className="px-3 py-1 text-xs font-mono border border-weavrn-border rounded-lg text-weavrn-muted hover:text-white hover:border-weavrn-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="text-xs font-mono text-weavrn-muted">{page} / {totalPages}</span>
          <button
            onClick={() => fetchPage(page + 1)}
            disabled={page === totalPages || isLoading}
            className="px-3 py-1 text-xs font-mono border border-weavrn-border rounded-lg text-weavrn-muted hover:text-white hover:border-weavrn-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

type PostFilter = "active" | "all";
type PostSort = "newest" | "oldest" | "earned" | "engagement";
type PostPlatform = "all" | "x" | "youtube";

function FilterTab({
  value,
  current,
  label,
  count,
  onClick,
}: {
  value: PostFilter;
  current: PostFilter;
  label: string;
  count?: number;
  onClick: (v: PostFilter) => void;
}) {
  const active = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
        active
          ? "bg-weavrn-surface text-white border border-weavrn-border"
          : "text-weavrn-muted hover:text-white"
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span
          className={`ml-1.5 ${active ? "text-weavrn-accent" : "text-weavrn-muted/50"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface TrackedPostsSectionProps {
  trackedPosts: TrackedPost[];
  walletAddress: string;
  onDataRefresh: () => Promise<void>;
}

const TrackedPostsSection = memo(function TrackedPostsSection({
  trackedPosts: initialPosts,
  walletAddress,
  onDataRefresh,
}: TrackedPostsSectionProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial state from URL
  const postsPage = Math.max(1, parseInt(searchParams.get("posts_page") ?? "1", 10));
  const postSort = (searchParams.get("posts_sort") as PostSort) ?? "newest";
  const postFilter = (searchParams.get("posts_status") as PostFilter) ?? "active";
  const platformFilter = (searchParams.get("posts_platform") as PostPlatform) ?? "all";

  const [trackedPosts, setTrackedPosts] = useState<TrackedPost[]>(initialPosts);
  const [postsPagination, setPostsPagination] = useState<TrackedPostsPagination | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for stable callbacks
  const pageRef = useRef(postsPage);
  const sortRef = useRef(postSort);
  const filterRef = useRef(postFilter);
  const platformRef = useRef(platformFilter);
  pageRef.current = postsPage;
  sortRef.current = postSort;
  filterRef.current = postFilter;
  platformRef.current = platformFilter;

  // Sync initial data from parent
  useEffect(() => { setTrackedPosts(initialPosts); }, [initialPosts]);

  const updateParams = useCallback((updates: Record<string, string | null>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null) params.delete(key);
      else params.set(key, val);
    }
    if (resetPage) params.delete("posts_page");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const rewards = await getRewards(walletAddress, {
        posts_page: pageRef.current,
        posts_sort: sortRef.current !== "newest" ? sortRef.current : undefined,
        posts_status: filterRef.current !== "active" ? filterRef.current : undefined,
        posts_platform: platformRef.current !== "all" ? platformRef.current as "x" | "youtube" : undefined,
      });
      setTrackedPosts(rewards.tracked_posts);
      setPostsPagination(rewards.tracked_posts_pagination ?? null);
    } catch {
      // Silently fail — parent data is still displayed
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch on mount and when URL params change
  useEffect(() => {
    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsPage, postSort, postFilter, platformFilter]);

  // Reset expanded post if it disappeared from data
  useEffect(() => {
    if (expandedPostId != null && !trackedPosts.some((p) => p.id === expandedPostId)) {
      setExpandedPostId(null);
    }
  }, [trackedPosts, expandedPostId]);

  const inactiveCount = trackedPosts.filter((p) => p.deleted_at || p.flagged).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">Tracked Posts</h3>
          <PlatformFilter value={platformFilter} onChange={(v) => updateParams({ posts_platform: v === "all" ? null : v })} />
          <div className="flex items-center gap-1">
            <FilterTab
              value="active"
              current={postFilter}
              label="Active"
              count={postsPagination && postFilter === "active" ? postsPagination.total : trackedPosts.length - inactiveCount}
              onClick={(v) => updateParams({ posts_status: v === "active" ? null : v })}
            />
            <FilterTab
              value="all"
              current={postFilter}
              label="All"
              count={postsPagination && postFilter === "all" ? postsPagination.total : trackedPosts.length}
              onClick={(v) => updateParams({ posts_status: v === "active" ? null : v })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={postSort}
            onChange={(e) => updateParams({ posts_sort: e.target.value === "newest" ? null : e.target.value })}
            className="px-2 py-1 text-xs font-mono bg-transparent border border-weavrn-border rounded-lg text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50 cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="earned">Top Earned</option>
            <option value="engagement">Engagement</option>
          </select>
          <RefreshButton
            walletAddress={walletAddress}
            onDataRefresh={onDataRefresh}
          />
        </div>
      </div>

      <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0F]/60 rounded-xl backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-weavrn-muted text-xs font-mono">
            <svg className="w-4 h-4 animate-spin text-weavrn-accent" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        </div>
      )}
      {trackedPosts.length === 0 && !isLoading ? (
        <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
          {postFilter === "active" && platformFilter === "all"
            ? "No posts discovered yet. Post about Weavrn on X or YouTube and they'll appear here automatically."
            : "No matching posts. Try changing filters."}
        </div>
      ) : trackedPosts.length === 0 && isLoading ? (
        <div className="py-12" />
      ) : (
        <>
        <div className="space-y-3">
          {trackedPosts.map((p) => {
            const isExpanded = expandedPostId === p.id;
            const isYouTube = p.platform === "youtube";
            const isBaseline = p.block_history.length === 1 && p.block_history[0].delta === 0 && !p.deleted_at && !p.flagged;
            return (
              <div
                key={p.id}
                className={`rounded-xl border bg-weavrn-surface/30 text-sm ${
                  isYouTube ? "border-l-2 border-l-red-500/30" : "border-l-2 border-l-weavrn-accent/30"
                } ${
                  p.deleted_at || p.flagged ? "border-red-500/20" : "border-weavrn-border/50"
                }`}
              >
                {(p.deleted_at || p.flagged) && (
                  <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-red-500/20 bg-red-500/5 rounded-t-xl">
                    <span className="text-[10px] font-mono text-red-400">
                      {p.deleted_at
                        ? "Post deleted from platform"
                        : (p.flag_reason === "duplicate content" ? "Duplicate content" : (p.flag_reason ?? "Flagged"))}
                    </span>
                  </div>
                )}
                <div
                  className="px-4 pt-4 pb-3 cursor-pointer hover:bg-weavrn-surface/50 transition-colors rounded-xl"
                  onClick={() => setExpandedPostId(isExpanded ? null : p.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <svg
                        className={`w-3 h-3 text-weavrn-muted flex-shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <div className={`w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center ${isYouTube ? "bg-red-500/10" : "bg-weavrn-accent/10"}`}>
                        {isYouTube ? (
                          <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-weavrn-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M18 4L6 20M6 4l12 16" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {p.text ? (
                          <p className="text-sm text-white/90 leading-snug line-clamp-2">
                            {p.text}
                          </p>
                        ) : (
                          <a
                            href={/^https?:\/\//.test(p.post_url) ? p.post_url : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-weavrn-accent hover:text-weavrn-accent-hover transition-colors font-mono text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.post_url}
                          </a>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {p.x_handle && (
                            <>
                              <span className="text-[10px] font-mono text-weavrn-muted/60">@{p.x_handle}</span>
                              <span className="text-[10px] text-weavrn-muted/40">&middot;</span>
                            </>
                          )}
                          <span className="text-[10px] font-mono text-weavrn-muted/60">
                            {relativeTime(p.posted_at ?? p.first_seen_at)}
                          </span>
                          {p.text && (
                            <a
                              href={/^https?:\/\//.test(p.post_url) ? p.post_url : '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-weavrn-accent/60 hover:text-weavrn-accent transition-colors font-mono text-[10px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              view
                            </a>
                          )}
                          {isBaseline && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              baseline
                            </span>
                          )}
                          {p.flagged && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              {p.flag_reason === "duplicate content"
                                ? "duplicate"
                                : "flagged"}
                            </span>
                          )}
                          {p.block_history_total === 1 &&
                            p.estimated_wvrn === 0 &&
                            !p.deleted_at &&
                            !p.flagged && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                baseline
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {p.estimated_wvrn > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-weavrn-accent/10 border border-weavrn-accent/20 text-weavrn-accent text-xs font-mono font-semibold">
                          {fmtWvrn(p.estimated_wvrn)} WVRN
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        {!isBaseline && (
                          <PostTrendChip delta={getLatestDelta(p.block_history)} />
                        )}
                        <span className="text-[10px] text-weavrn-muted font-mono">
                          Block {p.discovered_in_block}
                        </span>
                      </div>
                    </div>
                  </div>
                  {p.raw_score != null && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-weavrn-border/30 flex-wrap">
                      <EngagementStat
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3 h-3">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                        }
                        value={p.likes ?? 0}
                      />
                      {!isYouTube && (
                        <EngagementStat
                          icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3 h-3">
                              <polyline points="17 1 21 5 17 9"/>
                              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                              <polyline points="7 23 3 19 7 15"/>
                              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                            </svg>
                          }
                          value={p.retweets ?? 0}
                        />
                      )}
                      <EngagementStat
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3 h-3">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        }
                        value={`${p.replies ?? 0} ${isYouTube ? "comments" : "replies"}`}
                      />
                      <EngagementStat
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3 h-3">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        }
                        value={(p.views ?? 0).toLocaleString()}
                      />
                      <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-weavrn-surface border border-weavrn-border/40 text-[11px] font-mono">
                        <span className="text-weavrn-muted">score</span>
                        <span className="text-white">{p.raw_score}</span>
                      </span>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {p.raw_score != null && (
                      <ScoreBreakdown
                        likes={p.likes ?? 0}
                        retweets={p.retweets ?? 0}
                        replies={p.replies ?? 0}
                        views={p.views ?? 0}
                        platform={p.platform || "x"}
                      />
                    )}
                    {p.block_history_total > 0 && (
                      <div className="border-t border-weavrn-border/30 pt-3">
                        <PostHistoryPanel
                          postId={p.id}
                          walletAddress={walletAddress}
                          isYouTube={isYouTube}
                          estimatedWvrn={p.estimated_wvrn}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {postsPagination && postsPagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => updateParams({ posts_page: postsPage > 2 ? String(postsPage - 1) : null }, false)}
              disabled={postsPage === 1}
              className="px-3 py-1 text-xs font-mono border border-weavrn-border rounded-lg text-weavrn-muted hover:text-white hover:border-weavrn-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-xs font-mono text-weavrn-muted">
              {postsPage} / {postsPagination.total_pages}
            </span>
            <button
              onClick={() => updateParams({ posts_page: String(postsPage + 1) }, false)}
              disabled={postsPage === postsPagination.total_pages}
              className="px-3 py-1 text-xs font-mono border border-weavrn-border rounded-lg text-weavrn-muted hover:text-white hover:border-weavrn-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
        </>
      )}
      </div>
    </div>
  );
});

export default TrackedPostsSection;
