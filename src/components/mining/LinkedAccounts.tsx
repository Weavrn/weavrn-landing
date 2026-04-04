"use client";

import { memo, useState } from "react";
import { features } from "@/lib/features";

interface LinkedAccountsProps {
  xHandle: string | null;
  ytHandle: string | null;
  onUnlinkX: () => void;
  onUnlinkYT: () => void;
}

function AccountCard({
  platform,
  handle,
  onUnlink,
}: {
  platform: string;
  handle: string;
  onUnlink: () => void;
}) {
  const [confirming, setConfirming] = useState<"change" | "unlink" | null>(null);

  const handleAction = (action: "change" | "unlink") => {
    if (confirming === action) {
      onUnlink();
      setConfirming(null);
    } else {
      setConfirming(action);
    }
  };

  return (
    <div className="glow-card rounded-xl p-4 flex flex-col justify-between min-h-[88px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-weavrn-muted/40 uppercase tracking-widest">{platform}</span>
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-[10px] text-weavrn-muted/60">
                {confirming === "unlink" ? "unlink?" : "relink?"}
              </span>
              <button
                onClick={() => handleAction(confirming)}
                className="text-[10px] text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                confirm
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="text-[10px] text-weavrn-muted/40 hover:text-weavrn-muted transition-colors"
              >
                cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleAction("change")}
                className="text-[10px] text-weavrn-muted/40 hover:text-weavrn-accent transition-colors"
              >
                change
              </button>
              <button
                onClick={() => handleAction("unlink")}
                className="text-[10px] text-weavrn-muted/40 hover:text-red-400 transition-colors"
              >
                unlink
              </button>
            </>
          )}
        </div>
      </div>
      <span className="text-sm font-medium text-white mt-2">@{handle}</span>
    </div>
  );
}

const LinkedAccounts = memo(function LinkedAccounts({
  xHandle,
  ytHandle,
  onUnlinkX,
  onUnlinkYT,
}: LinkedAccountsProps) {
  const showYT = features.youtube;
  const hasAny = xHandle || (showYT && ytHandle);
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {xHandle ? (
        <div className="col-span-2">
          <AccountCard platform="X" handle={xHandle} onUnlink={onUnlinkX} />
        </div>
      ) : (
        <div className="col-span-2" />
      )}
      {showYT && ytHandle ? (
        <div className="col-span-2">
          <AccountCard platform="YouTube" handle={ytHandle} onUnlink={onUnlinkYT} />
        </div>
      ) : (
        <div className="col-span-2" />
      )}
    </div>
  );
});

export default LinkedAccounts;
