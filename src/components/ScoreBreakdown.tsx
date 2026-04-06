"use client";

import { memo } from "react";

interface Props {
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  platform: "x" | "youtube";
}

export default memo(function ScoreBreakdown({
  likes,
  retweets,
  replies,
  views,
  platform,
}: Props) {
  let rawScore: number;
  let formula: string;

  if (platform === "youtube") {
    rawScore = likes * 5 + replies * 10 + views * 0.02;
    formula = `(${likes} x 5) + (${replies} x 10) + (${views.toLocaleString()} x 0.02)`;
  } else {
    rawScore = likes * 1 + retweets * 3 + replies * 2 + views * 0.01;
    formula = `(${likes} x 1) + (${retweets} x 3) + (${replies} x 2) + (${views.toLocaleString()} x 0.01)`;
  }

  const effectiveScore = Math.sqrt(rawScore) * 100;

  return (
    <div className="p-3 rounded-lg bg-weavrn-dark border border-weavrn-border text-xs font-mono">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-weavrn-muted uppercase text-[10px] tracking-wider">
          {platform === "youtube" ? "YouTube" : "X"} Score
        </span>
      </div>
      <div className="text-weavrn-muted leading-relaxed">
        <span className="text-white">{formula}</span>
        <span className="text-weavrn-muted mx-1">=</span>
        <span className="text-white">{Number(rawScore.toFixed(2)).toLocaleString()}</span>
        <span className="text-weavrn-muted ml-2">raw</span>
      </div>
      <div className="mt-1 text-weavrn-muted">
        sqrt({Number(rawScore.toFixed(2)).toLocaleString()}) x 100
        <span className="mx-1">=</span>
        <span className="text-weavrn-accent font-semibold">
          {Number(effectiveScore.toFixed(2)).toLocaleString()}
        </span>
        <span className="text-weavrn-muted ml-1">effective</span>
      </div>
    </div>
  );
});
