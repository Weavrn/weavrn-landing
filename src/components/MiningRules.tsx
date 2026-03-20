"use client";

import { useState, useEffect, useCallback } from "react";
import { getMiningStats } from "@/lib/api";
import type { MiningStatsResponse } from "@/lib/api";

interface Props {
  followerCount?: number | null;
  subscriberCount?: number | null;
}

function RuleRow({
  label,
  threshold,
  userValue,
}: {
  label: string;
  threshold: number;
  userValue: number | null | undefined;
}) {
  const met = userValue != null && userValue >= threshold;
  const unknown = userValue == null;

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${
            unknown
              ? "text-weavrn-muted"
              : met
                ? "text-green-400"
                : "text-red-400"
          }`}
        >
          {unknown ? "-" : met ? "✓" : "✗"}
        </span>
        <span className="text-sm text-weavrn-muted">{label}</span>
      </div>
      <span className="text-xs font-mono text-weavrn-muted">
        {threshold.toLocaleString()}
      </span>
    </div>
  );
}

export default function MiningRules({
  followerCount,
  subscriberCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<MiningStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (stats) return;
    setLoading(true);
    try {
      const res = await getMiningStats();
      setStats(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    if (open) fetchStats();
  }, [open, fetchStats]);

  return (
    <div className="glow-card rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold text-white">Mining Rules</span>
        <svg
          className={`w-4 h-4 text-weavrn-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-weavrn-border/30 pt-3">
          {loading ? (
            <div className="text-center py-4 text-weavrn-muted text-xs">
              Loading...
            </div>
          ) : stats ? (
            <div className="space-y-0.5">
              <RuleRow
                label="Min engagement score"
                threshold={stats.rules.min_engagement_score}
                userValue={null}
              />
              <RuleRow
                label="Min X followers"
                threshold={stats.rules.min_x_followers}
                userValue={followerCount}
              />
              <RuleRow
                label="Min YouTube subscribers"
                threshold={stats.rules.min_yt_subscribers}
                userValue={subscriberCount}
              />
            </div>
          ) : (
            <div className="text-center py-4 text-weavrn-muted text-xs">
              Failed to load rules.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
