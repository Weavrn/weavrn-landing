"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getAgentListings, createListing, deactivateListing } from "@/lib/api";
import type { ServiceListing } from "@/lib/api";

interface Props {
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

const CATEGORIES = ["data", "code", "research", "automation", "creative", "trading", "other"];

export default function MyListings({ walletAddress, signer }: Props) {
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("code");
  const [tags, setTags] = useState("");
  const [pricingType, setPricingType] = useState("fixed");
  const [priceAmount, setPriceAmount] = useState("");
  const [escrowStrategy, setEscrowStrategy] = useState("all_or_nothing");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchListings = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getAgentListings(walletAddress, p, 20);
      setListings(res.listings);
      setTotal(res.total);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchListings(1);
  }, [fetchListings]);

  const handleCreate = async () => {
    if (!signer || !title || !description) return;
    setCreating(true);
    setError(null);
    try {
      await createListing(signer, walletAddress, {
        title,
        description,
        category,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        pricing_type: pricingType,
        price_amount: priceAmount || undefined,
        escrow_strategy: escrowStrategy,
        estimated_duration: estimatedDuration || undefined,
      });
      setTitle("");
      setDescription("");
      setTags("");
      setPriceAmount("");
      setEstimatedDuration("");
      setShowForm(false);
      fetchListings(1);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to create listing");
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!signer) return;
    setActing(id);
    try {
      await deactivateListing(signer, walletAddress, id);
      fetchListings(page);
    } catch {
      // ignore
    } finally {
      setActing(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="glow-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">My Listings</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg text-xs bg-weavrn-accent/10 text-weavrn-accent hover:bg-weavrn-accent/20 transition-colors"
        >
          {showForm ? "Cancel" : "New Listing"}
        </button>
      </div>

      {showForm && (
        <div className="p-4 rounded-lg bg-weavrn-dark border border-weavrn-border mb-4 space-y-3">
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="Service title"
            />
          </div>
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="What does this service do?"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Pricing</label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value)}
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              >
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Price (ETH)</label>
              <input
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
                placeholder="0.1"
              />
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Escrow</label>
              <select
                value={escrowStrategy}
                onChange={(e) => setEscrowStrategy(e.target.value)}
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              >
                <option value="all_or_nothing">All or Nothing</option>
                <option value="milestone">Milestone</option>
                <option value="trickle">Trickle</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Tags (comma-separated)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
                placeholder="ai, data, automation"
              />
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Estimated Duration</label>
              <input
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
                placeholder="2 hours"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !signer || !title || !description}
            className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
          >
            {creating ? "Creating..." : "Create Listing"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-weavrn-muted py-4">Loading listings...</p>
      ) : listings.length === 0 ? (
        <p className="text-sm text-weavrn-muted py-4">No listings yet</p>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-weavrn-dark border border-weavrn-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted">
                    {l.category}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${l.active ? "bg-weavrn-accent/10 text-weavrn-accent" : "bg-red-500/10 text-red-400"}`}>
                    {l.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm font-semibold truncate">{l.title}</p>
                <p className="text-xs text-weavrn-muted">
                  {l.pricing_type}{l.price_amount ? ` · ${l.price_amount} ${l.price_token}` : ""}{l.escrow_strategy !== "all_or_nothing" ? ` · ${l.escrow_strategy.replace(/_/g, " ")}` : ""}
                </p>
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                <a
                  href={`/marketplace?id=${l.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white transition-colors"
                >
                  View
                </a>
                {l.active && (
                  <button
                    onClick={() => handleDeactivate(l.id)}
                    disabled={acting === l.id}
                    className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {acting === l.id ? "..." : "Deactivate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => fetchListings(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30">Prev</button>
          <span className="text-xs text-weavrn-muted">{page} / {totalPages}</span>
          <button onClick={() => fetchListings(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
