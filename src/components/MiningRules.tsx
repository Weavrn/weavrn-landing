"use client";

import { memo, useState } from "react";
import type { MiningStatsResponse } from "@/lib/api";

interface Props {
  followerCount?: number | null;
  subscriberCount?: number | null;
  rules?: MiningStatsResponse["rules"] | null;
}

function RuleRow({
  label,
  threshold,
  userValue,
  currentLabel,
}: {
  label: string;
  threshold: number;
  userValue: number | null | undefined;
  currentLabel?: string;
}) {
  const met = userValue != null && userValue >= threshold;
  const unknown = userValue == null;

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between">
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
            {unknown ? "-" : met ? "\u2713" : "\u2717"}
          </span>
          <span className="text-sm text-weavrn-muted">{label}</span>
        </div>
        <span className="text-xs font-mono text-weavrn-muted">
          {threshold.toLocaleString()}
        </span>
      </div>
      {currentLabel && (
        <div className="flex items-center gap-2 mt-0.5 ml-4">
          <span className="text-xs text-weavrn-muted/60">{currentLabel}</span>
        </div>
      )}
    </div>
  );
}

export default memo(function MiningRules({
  followerCount,
  subscriberCount,
  rules,
}: Props) {
  const [open, setOpen] = useState(false);

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
          {rules ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-weavrn-accent mb-1">General</p>
                <RuleRow
                  label="Min engagement score per post"
                  threshold={rules.min_engagement_score}
                  userValue={null}
                />
                <p className="text-xs text-weavrn-muted/50 ml-4 mt-0.5">Posts below this threshold are excluded from rewards</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-weavrn-accent mb-1">X (Twitter)</p>
                <RuleRow
                  label="Min followers"
                  threshold={rules.min_x_followers}
                  userValue={followerCount}
                  currentLabel={
                    followerCount != null
                      ? `Your followers: ${followerCount.toLocaleString()}`
                      : undefined
                  }
                />
                <p className="text-xs text-weavrn-muted/50 ml-4 mt-0.5">Score: likes + retweets x3 + replies x2 + views x0.01</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-weavrn-accent mb-1">YouTube</p>
                <RuleRow
                  label="Min subscribers"
                  threshold={rules.min_yt_subscribers}
                  userValue={subscriberCount}
                  currentLabel={
                    subscriberCount != null
                      ? `Your subscribers: ${subscriberCount.toLocaleString()}`
                      : undefined
                  }
                />
                <p className="text-xs text-weavrn-muted/50 ml-4 mt-0.5">Score: likes + comments x2 + views x0.01. Video must mention weavrn/$WVRN in title or description.</p>
              </div>
              <div className="pt-1 border-t border-weavrn-border/20">
                <p className="text-xs text-weavrn-muted/50">Rewards are split between X (70%) and YouTube (30%) pools each block. Only engagement gained during the block counts (delta scoring).</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-weavrn-muted text-xs">
              Rules not available.
            </div>
          )}
        </div>
      )}
    </div>
  );
});
