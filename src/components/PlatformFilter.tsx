"use client";

import { memo } from "react";

type Platform = "all" | "x" | "youtube";

interface Props {
  value: Platform;
  onChange: (v: Platform) => void;
}

const OPTIONS: { value: Platform; label: string }[] = [
  { value: "all", label: "All" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
];

export default memo(function PlatformFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
              active
                ? "bg-weavrn-surface text-white border border-weavrn-border"
                : "text-weavrn-muted hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
});
