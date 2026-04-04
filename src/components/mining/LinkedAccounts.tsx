"use client";

import { memo } from "react";
import { features } from "@/lib/features";

interface LinkedAccountsProps {
  xHandle: string | null;
  ytHandle: string | null;
  onUnlinkX: () => void;
  onUnlinkYT: () => void;
}

const LinkedAccounts = memo(function LinkedAccounts({
  xHandle,
  ytHandle,
  onUnlinkX,
  onUnlinkYT,
}: LinkedAccountsProps) {
  const hasAny = xHandle || ytHandle;
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-4 text-sm">
      {xHandle && (
        <div className="flex items-center gap-2">
          <span className="text-weavrn-muted/60 text-xs">X</span>
          <span className="text-white font-mono text-xs">@{xHandle}</span>
          <button
            onClick={onUnlinkX}
            className="text-[10px] text-weavrn-muted/40 hover:text-red-400 transition-colors"
          >
            change
          </button>
        </div>
      )}
      {features.youtube && ytHandle && (
        <div className="flex items-center gap-2">
          <span className="text-weavrn-muted/60 text-xs">YouTube</span>
          <span className="text-white font-mono text-xs">@{ytHandle}</span>
          <button
            onClick={onUnlinkYT}
            className="text-[10px] text-weavrn-muted/40 hover:text-red-400 transition-colors"
          >
            change
          </button>
        </div>
      )}
    </div>
  );
});

export default LinkedAccounts;
