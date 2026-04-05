"use client";

import { memo } from "react";

type Platform = "all" | "x" | "youtube";

interface Props {
  value: Platform;
  onChange: (v: Platform) => void;
}

const OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "x" as const, label: "X" },
  { value: "youtube" as const, label: "YouTube" },
] as const;

function PlatformFilter({ value, onChange }: Props) {
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
}

export default memo(PlatformFilter);
