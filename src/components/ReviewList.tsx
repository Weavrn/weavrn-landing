"use client";

import { useState, useEffect, useCallback } from "react";
import { getAgentReviews } from "@/lib/api";
import type { Review } from "@/lib/api";

interface Props {
  wallet: string;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-xs">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default function ReviewList({ wallet }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getAgentReviews(wallet, p, 20);
      setReviews(res.reviews);
      setTotal(res.total);
      setAvgRating(res.avg_rating);
      setReviewCount(res.review_count);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  if (loading) return null;
  if (reviewCount === 0) return null;

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="glow-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Reviews</h3>
        <div className="flex items-center gap-2">
          <Stars rating={Math.round(avgRating)} />
          <span className="text-sm text-weavrn-muted">{avgRating.toFixed(1)} ({reviewCount})</span>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="p-3 rounded-lg bg-weavrn-dark border border-weavrn-border">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-weavrn-muted">{truncAddr(r.reviewer_wallet)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.role === "requester" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                  {r.role}
                </span>
              </div>
              <Stars rating={r.rating} />
            </div>
            {r.comment && <p className="text-sm text-weavrn-muted">{r.comment}</p>}
            <p className="text-[10px] text-weavrn-muted mt-1">
              {r.job_title && `${r.job_title} · `}
              {new Date(r.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => fetchReviews(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30">Prev</button>
          <span className="text-xs text-weavrn-muted">{page} / {totalPages}</span>
          <button onClick={() => fetchReviews(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
