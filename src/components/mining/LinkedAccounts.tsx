"use client";

import { memo, useState } from "react";
import { features } from "@/lib/features";

interface LinkedAccountsProps {
  xHandle: string | null;
  ytHandle: string | null;
  onUnlinkX: () => void;
  onUnlinkYT: () => void;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z" />
    </svg>
  );
}

function AccountCard({
  platform,
  handle,
  icon,
  onUnlink,
}: {
  platform: string;
  handle: string;
  icon: React.ReactNode;
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
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-weavrn-muted/60">{platform}</span>
        </div>
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
          <AccountCard
            platform="X"
            handle={xHandle}
            icon={<XIcon className="w-3.5 h-3.5 text-white" />}
            onUnlink={onUnlinkX}
          />
        </div>
      ) : (
        <div className="col-span-2" />
      )}
      {showYT && ytHandle ? (
        <div className="col-span-2">
          <AccountCard
            platform="YouTube"
            handle={ytHandle}
            icon={<YouTubeIcon className="w-4 h-4 text-red-500" />}
            onUnlink={onUnlinkYT}
          />
        </div>
      ) : (
        <div className="col-span-2" />
      )}
    </div>
  );
});

export default LinkedAccounts;
