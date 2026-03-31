"use client";

import { memo, useState } from "react";
import type { JsonRpcSigner } from "ethers";
import {
  startYouTubeVerification,
  verifyYouTubeHandle,
  unlinkYouTubeHandle,
} from "@/lib/api";

interface Props {
  walletAddress: string;
  signer: JsonRpcSigner | null;
  ytHandle: string | null;
  ytVerificationCode: string | null;
  ytVerificationHandle: string | null;
  onUpdate: () => void;
}

export default memo(function YouTubeVerification({
  walletAddress,
  signer,
  ytHandle,
  ytVerificationCode,
  ytVerificationHandle,
  onUpdate,
}: Props) {
  const [handleInput, setHandleInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = handleInput.replace(/^@/, "").trim();
    if (!cleaned) return;
    setSubmitting(true);
    setError(null);
    try {
      if (!signer) {
        setError("Wallet not connected");
        return;
      }
      await startYouTubeVerification(signer, walletAddress, cleaned);
      setHandleInput("");
      onUpdate();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      if (!signer) {
        setError("Wallet not connected");
        return;
      }
      await verifyYouTubeHandle(signer, walletAddress);
      onUpdate();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleUnlink = async () => {
    setError(null);
    try {
      if (!signer) {
        setError("Wallet not connected");
        return;
      }
      await unlinkYouTubeHandle(signer, walletAddress);
      onUpdate();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleCopy = async () => {
    if (!ytVerificationCode) return;
    await navigator.clipboard.writeText(ytVerificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Linked state
  if (ytHandle) {
    return (
      <div className="glow-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">YouTube</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white">
            @{ytHandle}
          </span>
          <button
            onClick={handleUnlink}
            className="text-xs text-weavrn-muted/50 hover:text-red-400 transition-colors"
          >
            unlink
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    );
  }

  // Pending verification
  if (ytVerificationCode) {
    return (
      <div className="glow-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">
          Verify @{ytVerificationHandle}
        </h3>
        <p className="text-sm text-weavrn-muted mb-4">
          Add this code to your YouTube channel description, then click Verify.
          You can remove it after verification.
        </p>

        <div className="flex items-center gap-2 mb-6 p-3 bg-weavrn-dark rounded-lg border border-weavrn-border">
          <code className="flex-1 text-weavrn-accent font-mono text-lg font-bold tracking-wider">
            {ytVerificationCode}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs text-weavrn-muted hover:text-white border border-weavrn-border rounded transition-colors"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex-1 px-6 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            {verifying ? "Checking..." : "Verify"}
          </button>
          <button
            onClick={onUpdate}
            className="px-4 py-2.5 text-sm text-weavrn-muted hover:text-white border border-weavrn-border rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    );
  }

  // No handle — input form
  return (
    <div className="glow-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-2">
        Link your YouTube channel
      </h3>
      <p className="text-sm text-weavrn-muted mb-4">
        Verify ownership of your YouTube channel to earn from video content.
        We&apos;ll ask you to add a short code to your channel description.
      </p>
      <form onSubmit={handleStartVerification} className="flex gap-2">
        <input
          type="text"
          value={handleInput}
          onChange={(e) => setHandleInput(e.target.value)}
          placeholder="@yourchannel"
          className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50 transition-colors placeholder:text-weavrn-muted/50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
        >
          {submitting ? "..." : "Continue"}
        </button>
      </form>
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </div>
  );
});
