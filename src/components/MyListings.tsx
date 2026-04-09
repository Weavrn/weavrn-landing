"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getAgentListings, createListing, deactivateListing } from "@/lib/api";
import type { ServiceListing, InputField } from "@/lib/api";

interface Props {
  walletAddress: string;
  signer: JsonRpcSigner | null;
  agentWallet?: string;
  compact?: boolean;
}

const CATEGORIES = ["data", "code", "research", "automation", "creative", "trading", "other"];
const FIELD_TYPES: InputField["type"][] = ["text", "textarea", "select", "code", "url", "git_url", "file", "number"];

function emptyField(): InputField {
  return { name: "", label: "", type: "text", required: false };
}

function InputFieldEditor({ field, onChange, onRemove }: {
  field: InputField;
  onChange: (f: InputField) => void;
  onRemove: () => void;
}) {
  const inputCls = "w-full px-2 py-1.5 bg-weavrn-surface border border-weavrn-border rounded text-xs focus:outline-none focus:border-weavrn-accent/50";
  return (
    <div className="p-3 rounded-lg bg-weavrn-surface border border-weavrn-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-weavrn-muted uppercase tracking-wider">Field</span>
        <button onClick={onRemove} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Label</label>
          <input
            value={field.label}
            onChange={(e) => {
              const label = e.target.value;
              const name = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
              onChange({ ...field, label, name });
            }}
            placeholder="GitHub Repository URL"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Type</label>
          <select
            value={field.type}
            onChange={(e) => onChange({ ...field, type: e.target.value as InputField["type"] })}
            className={inputCls}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Placeholder</label>
          <input
            value={field.placeholder || ""}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })}
            placeholder="Optional"
            className={inputCls}
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-1.5 text-xs text-weavrn-muted cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onChange({ ...field, required: e.target.checked })}
              className="rounded border-weavrn-border"
            />
            Required
          </label>
        </div>
      </div>
      {field.type === "select" && (
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Options (comma-separated)</label>
          <input
            value={field.options?.join(", ") || ""}
            onChange={(e) => onChange({ ...field, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="Option A, Option B, Option C"
            className={inputCls}
          />
        </div>
      )}
      {field.type === "file" && (
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Accepted extensions (comma-separated)</label>
          <input
            value={field.accept?.join(", ") || ""}
            onChange={(e) => onChange({ ...field, accept: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) || undefined })}
            placeholder=".py, .ts, .json"
            className={inputCls}
          />
        </div>
      )}
      {field.description !== undefined || field.type === "git_url" || field.type === "file" ? null : (
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Helper text</label>
          <input
            value={field.description || ""}
            onChange={(e) => onChange({ ...field, description: e.target.value || undefined })}
            placeholder="Optional description shown below the label"
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}

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
  const [inputFields, setInputFields] = useState<InputField[]>([]);
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
      const validFields = inputFields.filter((f) => f.name && f.label);
      await createListing(signer, walletAddress, {
        title,
        description,
        category,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        pricing_type: pricingType,
        price_amount: priceAmount || undefined,
        escrow_strategy: escrowStrategy,
        estimated_duration: estimatedDuration || undefined,
        input_schema: validFields.length > 0 ? validFields : undefined,
      });
      setTitle("");
      setDescription("");
      setTags("");
      setPriceAmount("");
      setEstimatedDuration("");
      setInputFields([]);
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
          data-testid="new-listing-btn"
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
              name="listing-title"
              data-testid="listing-title-input"
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
              name="listing-description"
              data-testid="listing-desc-input"
              className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="Describe what this service does, expected inputs, and what the requester will receive..."
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                name="listing-category"
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
                name="listing-pricing"
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
                name="listing-price"
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
                placeholder="0.001"
              />
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Escrow</label>
              <select
                value={escrowStrategy}
                onChange={(e) => setEscrowStrategy(e.target.value)}
                name="listing-escrow"
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
                name="listing-tags"
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
                placeholder="ai, data, automation"
              />
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Estimated Duration</label>
              <input
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                name="listing-duration"
                className="w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
                placeholder="2 hours"
              />
            </div>
          </div>

          {/* Input Fields Builder */}
          <div className="border-t border-weavrn-border/50 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-weavrn-muted">Input Fields (optional)</label>
              <button
                onClick={() => {
                  if (inputFields.length < 10) setInputFields([...inputFields, emptyField()]);
                }}
                disabled={inputFields.length >= 10}
                className="text-[10px] px-2 py-1 rounded bg-weavrn-accent/10 text-weavrn-accent hover:bg-weavrn-accent/20 disabled:opacity-30 transition-colors"
              >
                + Add Field
              </button>
            </div>
            {inputFields.length === 0 && (
              <p className="text-[10px] text-weavrn-muted/50">No custom fields. Requesters will see generic text inputs.</p>
            )}
            <div className="space-y-2">
              {inputFields.map((field, i) => (
                <InputFieldEditor
                  key={i}
                  field={field}
                  onChange={(updated) => {
                    const next = [...inputFields];
                    next[i] = updated;
                    setInputFields(next);
                  }}
                  onRemove={() => setInputFields(inputFields.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !signer || !title || !description}
            data-testid="create-listing-btn"
            className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {creating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                Creating...
              </>
            ) : "Create Listing"}
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
                  {l.input_schema && l.input_schema.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                      {l.input_schema.length} fields
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold truncate">{l.title}</p>
                <p className="text-xs text-weavrn-muted">
                  {l.pricing_type}{l.price_amount ? ` \u00b7 ${l.price_amount} ${l.price_token}` : ""}{l.escrow_strategy !== "all_or_nothing" ? ` \u00b7 ${l.escrow_strategy.replace(/_/g, " ")}` : ""}
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
