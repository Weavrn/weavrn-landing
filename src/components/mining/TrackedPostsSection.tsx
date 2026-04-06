"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
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
              <th className="text-left py-1.5 pr-3">Block</th>
              <th className="text-right py-1.5 px-2">Likes</th>
              {!isYouTube && <th className="text-right py-1.5 px-2">RTs</th>}
              <th className="text-right py-1.5 px-2">{isYouTube ? "Comments" : "Replies"}</th>
              <th className="text-right py-1.5 px-2">Views</th>
              <th className="text-right py-1.5 px-2">Score</th>
              <th className="text-right py-1.5 px-2">Delta</th>
              <th className="text-right py-1.5 pl-2">WVRN</th>
            </tr>
          </thead>
          <tbody>
            {history.map((b) => (
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
            return (
              <div
                key={p.id}
                className={`rounded-xl border bg-weavrn-surface/30 text-sm ${
                  p.deleted_at || p.flagged
                    ? "border-red-500/20 opacity-60"
                    : "border-weavrn-border/50"
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-weavrn-surface/50 transition-colors rounded-xl"
                  onClick={() =>
                    setExpandedPostId(isExpanded ? null : p.id)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <svg
                        className={`w-3 h-3 text-weavrn-muted flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div className="min-w-0 flex-1">
                        {p.text ? (
                          <p className="text-sm text-white/90 leading-snug line-clamp-2">
                            {p.text}
                          </p>
                        ) : (
                          <a
                            href={p.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-weavrn-accent hover:text-weavrn-accent-hover transition-colors font-mono text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.post_url}
                          </a>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-weavrn-muted/60">
                            {isYouTube ? "YouTube" : "X"}
                          </span>
                          {p.text && (
                            <a
                              href={p.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-weavrn-accent/60 hover:text-weavrn-accent transition-colors font-mono text-[10px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              view
                            </a>
                          )}
                          {p.deleted_at && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                              deleted
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
                        <span className="text-xs font-mono text-weavrn-accent font-medium">
                          {fmtWvrn(p.estimated_wvrn)} WVRN
                        </span>
                      )}
                      <span className="text-[10px] text-weavrn-muted font-mono">
                        Block {p.discovered_in_block}
                      </span>
                    </div>
                  </div>
                  {p.raw_score != null && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-weavrn-border/30">
                      <span className="text-[11px] text-weavrn-muted font-mono">
                        {p.likes ?? 0} likes
                      </span>
                      {!isYouTube && (
                        <span className="text-[11px] text-weavrn-muted font-mono">
                          {p.retweets ?? 0} RTs
                        </span>
                      )}
                      <span className="text-[11px] text-weavrn-muted font-mono">
                        {p.replies ?? 0}{" "}
                        {isYouTube ? "comments" : "replies"}
                      </span>
                      <span className="text-[11px] text-weavrn-muted font-mono">
                        {(p.views ?? 0).toLocaleString()} views
                      </span>
                      <span className="ml-auto text-[11px] font-mono text-weavrn-muted">
                        score {p.raw_score}
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
