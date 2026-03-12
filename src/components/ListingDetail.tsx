"use client";

import { useState, useEffect, useCallback } from "react";
import { getListing, createJob } from "@/lib/api";
import type { ServiceListing } from "@/lib/api";

interface Props {
  id: number;
  walletAddress?: string | null;
  signer?: import("ethers").JsonRpcSigner | null;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ListingDetail({ id, walletAddress, signer }: Props) {
  const [listing, setListing] = useState<ServiceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleRequestService = async () => {
    if (!signer || !walletAddress || !listing) return;
    setRequesting(true);
    setRequestError(null);
    try {
      await createJob(signer, walletAddress, {
        listing_id: listing.id,
        provider_wallet: listing.wallet_address,
        title: listing.title,
        description: `Service request for: ${listing.title}`,
      });
      setRequested(true);
    } catch (err: unknown) {
      setRequestError((err as { message?: string }).message || "Failed to request service");
    } finally {
      setRequesting(false);
    }
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getListing(id);
      setListing(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Listing not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading) return <p className="text-center text-weavrn-muted py-10">Loading...</p>;
  if (error || !listing) {
    return (
      <div className="text-center py-10">
        <p className="text-red-400">{error || "Listing not found"}</p>
        <a href="/marketplace" className="text-sm text-weavrn-accent hover:underline mt-4 inline-block">Back to marketplace</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="glow-card rounded-xl p-6">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold">{listing.title}</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted">
            {listing.category}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <a href={`/agents?wallet=${listing.wallet_address}`} className="text-sm text-weavrn-accent hover:underline">
            {(listing as unknown as { agent_name?: string }).agent_name || truncAddr(listing.wallet_address)}
          </a>
          {listing.avg_rating !== undefined && Number(listing.avg_rating) > 0 && (
            <span className="text-sm text-yellow-400">{Number(listing.avg_rating).toFixed(1)} ({listing.review_count} reviews)</span>
          )}
        </div>

        <p className="text-sm text-weavrn-muted mb-4 whitespace-pre-wrap">{listing.description}</p>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {listing.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent">{tag}</span>
          ))}
        </div>

        {walletAddress && walletAddress.toLowerCase() !== listing.wallet_address.toLowerCase() && (
          <div className="pt-2 border-t border-weavrn-border/50">
            {requested ? (
              <p className="text-sm text-weavrn-accent">Service requested — check your dashboard for updates.</p>
            ) : (
              <>
                {requestError && <p className="text-xs text-red-400 mb-2">{requestError}</p>}
                <button
                  onClick={handleRequestService}
                  disabled={requesting || !signer}
                  className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
                >
                  {requesting ? "Requesting..." : "Request Service"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glow-card rounded-xl p-4">
          <p className="text-xs text-weavrn-muted mb-1">Pricing</p>
          <p className="text-sm font-semibold capitalize">{listing.pricing_type}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-xs text-weavrn-muted mb-1">Price</p>
          <p className="text-sm font-mono">{listing.price_amount || "—"} {listing.price_token}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-xs text-weavrn-muted mb-1">Escrow</p>
          <p className="text-sm font-semibold">{listing.escrow_strategy.replace(/_/g, " ")}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-xs text-weavrn-muted mb-1">Duration</p>
          <p className="text-sm">{listing.estimated_duration || "—"}</p>
        </div>
      </div>

      <div className="text-center">
        <a href="/marketplace" className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors">
          Back to marketplace
        </a>
      </div>
    </div>
  );
}
