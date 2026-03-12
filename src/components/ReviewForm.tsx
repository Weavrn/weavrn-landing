"use client";

import { useState } from "react";
import { JsonRpcSigner } from "ethers";
import { submitReview } from "@/lib/api";

interface Props {
  jobId: number;
  walletAddress: string;
  signer: JsonRpcSigner | null;
  onSubmitted: () => void;
}

export default function ReviewForm({ jobId, walletAddress, signer, onSubmitted }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!signer) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(signer, walletAddress, jobId, rating, comment || undefined);
      onSubmitted();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-weavrn-dark border border-weavrn-border">
      <h4 className="text-sm font-semibold mb-3">Leave a Review</h4>

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`text-lg ${n <= rating ? "text-yellow-400" : "text-weavrn-border"}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50 mb-3"
        placeholder="Optional comment..."
      />

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !signer}
        className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </div>
  );
}
