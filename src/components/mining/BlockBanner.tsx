"use client";

import { memo } from "react";
import type { CurrentBlock } from "@/lib/api";
import BlockCountdown from "./BlockCountdown";

interface BlockBannerProps {
  currentBlock: CurrentBlock;
  xHandle: string | null;
  ytHandle: string | null;
  onUnlink: () => void;
  onBlockClose: () => void;
}

const BlockBanner = memo(function BlockBanner({
  currentBlock,
  xHandle,
  ytHandle,
  onUnlink,
  onBlockClose,
}: BlockBannerProps) {
  return (
    <div className="glow-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            Block {currentBlock.number}
          </h3>
          <p className="text-sm text-weavrn-muted mt-1">
            {xHandle && (
              <>
                @{xHandle}
                <button
                  onClick={onUnlink}
                  className="ml-2 text-xs text-weavrn-muted/50 hover:text-red-400 transition-colors"
                >
                  change
                </button>
              </>
            )}
            {xHandle && ytHandle && (
              <span className="mx-2 text-weavrn-border">|</span>
            )}
            {ytHandle && (
              <span className="text-weavrn-muted">YT @{ytHandle}</span>
            )}
          </p>
        </div>
        <BlockCountdown
          endTime={currentBlock.end_time}
          blockNumber={currentBlock.number}
          onBlockClose={onBlockClose}
        />
      </div>
    </div>
  );
});

export default BlockBanner;
