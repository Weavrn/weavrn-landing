"use client";

import { memo, useState, useMemo, useEffect } from "react";
import type { TrackedPost } from "@/lib/api";
import ScoreBreakdown from "../ScoreBreakdown";
import PlatformFilter from "../PlatformFilter";
import RefreshButton from "./RefreshButton";

const fmtWvrn = (n: number) =>
  Number(n.toFixed(2)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type PostFilter = "active" | "all";
type PostSort = "newest" | "oldest" | "earned";

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
  trackedPosts,
  walletAddress,
  onDataRefresh,
}: TrackedPostsSectionProps) {
  const [postFilter, setPostFilter] = useState<PostFilter>("active");
  const [postSort, setPostSort] = useState<PostSort>("newest");
  const [platformFilter, setPlatformFilter] = useState<
    "all" | "x" | "youtube"
  >("all");
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);

  // Reset expanded post if it disappeared from data
  useEffect(() => {
    if (
      expandedPostId != null &&
      !trackedPosts.some((p) => p.id === expandedPostId)
    ) {
      setExpandedPostId(null);
    }
  }, [trackedPosts, expandedPostId]);

  const filteredPosts = useMemo(() => {
    let posts = trackedPosts;
    if (platformFilter !== "all") {
      posts = posts.filter((p) => p.platform === platformFilter);
    }
    if (postFilter === "active") {
      posts = posts.filter((p) => !p.deleted_at && !p.flagged);
    }
    if (postSort === "oldest") {
      return [...posts].reverse();
    }
    if (postSort === "earned") {
      return [...posts].sort((a, b) => b.estimated_wvrn - a.estimated_wvrn);
    }
    return posts;
  }, [trackedPosts, postFilter, postSort, platformFilter]);

  const inactiveCount = trackedPosts.filter(
    (p) => p.deleted_at || p.flagged,
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">Tracked Posts</h3>
          <PlatformFilter value={platformFilter} onChange={setPlatformFilter} />
          <div className="flex items-center gap-1">
            <FilterTab
              value="active"
              current={postFilter}
              label="Active"
              count={trackedPosts.length - inactiveCount}
              onClick={setPostFilter}
            />
            {inactiveCount > 0 && (
              <FilterTab
                value="all"
                current={postFilter}
                label="All"
                count={trackedPosts.length}
                onClick={setPostFilter}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={postSort}
            onChange={(e) => setPostSort(e.target.value as PostSort)}
            className="px-2 py-1 text-xs font-mono bg-transparent border border-weavrn-border rounded-lg text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50 cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="earned">Top Earned</option>
          </select>
          <RefreshButton
            walletAddress={walletAddress}
            onDataRefresh={onDataRefresh}
          />
        </div>
      </div>

      {trackedPosts.length === 0 ? (
        <div className="text-center py-12 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
          No posts discovered yet. Post about Weavrn on X or YouTube and
          they&apos;ll appear here automatically.
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-8 text-weavrn-muted text-sm border border-dashed border-weavrn-border rounded-xl">
          No matching posts. Try changing filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((p) => {
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
                          {p.block_history.length === 1 &&
                            p.block_history[0].delta === 0 &&
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
                    <div className="border-t border-weavrn-border/30 pt-3">
                      {p.block_history.length === 0 ? (
                        <p className="text-xs text-weavrn-muted text-center py-3">
                          No block history yet
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] font-mono">
                            <thead>
                              <tr className="text-weavrn-muted border-b border-weavrn-border/20">
                                <th className="text-left py-1.5 pr-3">
                                  Block
                                </th>
                                <th className="text-right py-1.5 px-2">
                                  Likes
                                </th>
                                {!isYouTube && (
                                  <th className="text-right py-1.5 px-2">
                                    RTs
                                  </th>
                                )}
                                <th className="text-right py-1.5 px-2">
                                  {isYouTube ? "Comments" : "Replies"}
                                </th>
                                <th className="text-right py-1.5 px-2">
                                  Views
                                </th>
                                <th className="text-right py-1.5 px-2">
                                  Score
                                </th>
                                <th className="text-right py-1.5 px-2">
                                  Delta
                                </th>
                                <th className="text-right py-1.5 pl-2">
                                  WVRN
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.block_history.map((b) => (
                                <tr
                                  key={b.block_number}
                                  className="text-weavrn-muted/80 border-b border-weavrn-border/10"
                                >
                                  <td className="py-1.5 pr-3 text-white">
                                    {b.block_number}
                                  </td>
                                  <td className="text-right py-1.5 px-2">
                                    {b.likes}
                                  </td>
                                  {!isYouTube && (
                                    <td className="text-right py-1.5 px-2">
                                      {b.retweets}
                                    </td>
                                  )}
                                  <td className="text-right py-1.5 px-2">
                                    {b.replies}
                                  </td>
                                  <td className="text-right py-1.5 px-2">
                                    {b.views.toLocaleString()}
                                  </td>
                                  <td className="text-right py-1.5 px-2">
                                    {b.raw_score}
                                  </td>
                                  <td className="text-right py-1.5 px-2">
                                    {b.delta}
                                  </td>
                                  <td className="text-right py-1.5 pl-2 text-weavrn-accent">
                                    {fmtWvrn(b.earned)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-weavrn-border/30 text-white font-medium">
                                <td
                                  className="py-1.5 pr-3"
                                  colSpan={isYouTube ? 6 : 7}
                                >
                                  Total
                                </td>
                                <td className="text-right py-1.5 pl-2 text-weavrn-accent">
                                  {fmtWvrn(p.estimated_wvrn)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default TrackedPostsSection;
