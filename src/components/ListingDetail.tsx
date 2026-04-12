"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getListing, createJob, uploadJobFile } from "@/lib/api";
import type { ServiceListing, InputField } from "@/lib/api";

interface Props {
  id: number;
  walletAddress?: string | null;
  signer?: import("ethers").JsonRpcSigner | null;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function DynamicField({ field, value, onChange, fileRef }: {
  field: InputField;
  value: unknown;
  onChange: (val: unknown) => void;
  fileRef?: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const base = "w-full bg-weavrn-dark border border-weavrn-border rounded-lg p-3 text-sm text-white placeholder:text-weavrn-muted focus:border-weavrn-accent/50 focus:outline-none";

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          maxLength={field.max_length}
          className={`${base} resize-none`}
        />
      );
    case "code":
      return (
        <textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Paste code here..."}
          rows={6}
          maxLength={field.max_length}
          className={`${base} resize-none font-mono text-xs`}
        />
      );
    case "select":
      return (
        <select
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "number":
      return (
        <input
          type="number"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      );
    case "file":
      return (
        <div>
          <input
            ref={(el) => { if (fileRef) fileRef.current = el; }}
            type="file"
            accept={field.accept?.join(",") || undefined}
            onChange={(e) => onChange(e.target.files?.[0] || null)}
            className="block w-full text-sm text-weavrn-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-weavrn-border file:bg-weavrn-surface file:text-sm file:text-weavrn-accent hover:file:bg-weavrn-accent/10 file:cursor-pointer"
          />
          {value instanceof File && (
            <p className="text-[10px] text-weavrn-muted mt-1">{(value as File).name} ({Math.round((value as File).size / 1024)}KB)</p>
          )}
        </div>
      );
    case "url":
    case "git_url":
      return (
        <input
          type="url"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || (field.type === "git_url" ? "https://github.com/owner/repo" : "https://")}
          className={base}
        />
      );
    default:
      return (
        <input
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          className={base}
        />
      );
  }
}

export default function ListingDetail({ id, walletAddress, signer }: Props) {
  const [listing, setListing] = useState<ServiceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [createdJobId, setCreatedJobId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  // Generic fallback fields
  const [description, setDescription] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  // Dynamic form state
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const fileInputRefs = useRef<Record<string, React.MutableRefObject<HTMLInputElement | null>>>({});
  const getFileRef = (name: string) => {
    if (!fileInputRefs.current[name]) {
      fileInputRefs.current[name] = { current: null };
    }
    return fileInputRefs.current[name];
  };

  const hasSchema = listing?.input_schema && Array.isArray(listing.input_schema) && listing.input_schema.length > 0;

  const setFieldValue = (name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestService = async () => {
    if (!signer || !walletAddress || !listing) return;
    setRequesting(true);
    setRequestError(null);
    try {
      // Validate required fields
      if (hasSchema) {
        for (const field of listing.input_schema!) {
          const val = formValues[field.name];
          if (field.required && field.type !== "file") {
            if (!val || (typeof val === "string" && !val.trim())) {
              setRequestError(`${field.label} is required`);
              setRequesting(false);
              return;
            }
          }
          if (typeof val === "string" && val.length > 10000) {
            setRequestError(`${field.label} exceeds maximum length (10000 chars)`);
            setRequesting(false);
            return;
          }
          if ((field.type === "url" || field.type === "git_url") && typeof val === "string" && val.trim()) {
            try { new URL(val); } catch {
              setRequestError(`${field.label} must be a valid URL`);
              setRequesting(false);
              return;
            }
          }
        }
      }

      // Build input_data (exclude file fields — those get uploaded after job creation)
      const inputData: Record<string, unknown> = {};
      const fileFields: { field: InputField; file: File }[] = [];
      if (hasSchema) {
        for (const field of listing.input_schema!) {
          const val = formValues[field.name];
          if (field.type === "file" && val instanceof File) {
            fileFields.push({ field, file: val });
          } else if (val !== undefined && val !== null && val !== "") {
            inputData[field.name] = val;
          }
        }
      }

      const job = await createJob(signer, walletAddress, {
        listing_id: listing.id,
        provider_wallet: listing.wallet_address,
        title: listing.title,
        description: hasSchema ? `Service request for: ${listing.title}` : (description.trim() || `Service request for: ${listing.title}`),
        initial_message: hasSchema ? undefined : (initialMessage.trim() || undefined),
        input_data: hasSchema && Object.keys(inputData).length > 0 ? inputData : undefined,
      });

      // Upload file fields after job creation
      const failedFiles: string[] = [];
      for (const { file } of fileFields) {
        try {
          await uploadJobFile(signer, walletAddress, job.id, file);
        } catch {
          failedFiles.push(file.name);
        }
      }

      if (failedFiles.length > 0) {
        setCreatedJobId(job.id);
        setRequestError(`${failedFiles.length} file(s) failed to upload: ${failedFiles.join(", ")}. The job was created — go to your dashboard to retry.`);
      } else {
        setRequested(true);
        setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
      }
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
      if (data.input_schema && typeof data.input_schema === "string") {
        try { data.input_schema = JSON.parse(data.input_schema); } catch { data.input_schema = null; }
      }
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

  const listingExt = listing as ServiceListing & { agent_name?: string; accepted_inputs?: string[]; output_types?: string[] };

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
            {listingExt.agent_name || truncAddr(listing.wallet_address)}
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

        {/* Accepted inputs / output types */}
        {(listingExt.accepted_inputs?.length || listingExt.output_types?.length) ? (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {listingExt.accepted_inputs?.map((inp) => (
              <span key={`in-${inp}`} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                accepts: {inp}
              </span>
            ))}
            {listingExt.output_types?.map((out) => (
              <span key={`out-${out}`} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                outputs: {out}
              </span>
            ))}
          </div>
        ) : null}

        {walletAddress && walletAddress.toLowerCase() !== listing.wallet_address.toLowerCase() && (
          <div className="pt-4 border-t border-weavrn-border/50">
            {requested ? (
              <p className="text-sm text-weavrn-accent">Service requested — redirecting to <a href="/dashboard" className="underline hover:text-weavrn-accent-hover">your dashboard</a>...</p>
            ) : createdJobId ? (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{requestError}</p>
                <a
                  href="/dashboard"
                  className="inline-block px-4 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm text-weavrn-accent hover:bg-weavrn-accent/10 transition-colors"
                >
                  View job on dashboard
                </a>
              </div>
            ) : !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                disabled={!signer}
                className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
              >
                Request Service
              </button>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Request this service</h4>

                {hasSchema ? (
                  /* Dynamic form from input_schema */
                  listing.input_schema!.map((field) => (
                    <div key={field.name}>
                      <label className="text-xs text-weavrn-muted block mb-1">
                        {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-[10px] text-weavrn-muted/60 mb-1">{field.description}</p>
                      )}
                      <DynamicField
                        field={field}
                        value={formValues[field.name]}
                        onChange={(val) => setFieldValue(field.name, val)}
                        fileRef={field.type === "file" ? getFileRef(field.name) : undefined}
                      />
                    </div>
                  ))
                ) : (
                  /* Generic fallback */
                  <>
                    <div>
                      <label className="text-xs text-weavrn-muted block mb-1">What do you need?</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what you'd like done..."
                        rows={3}
                        className="w-full bg-weavrn-dark border border-weavrn-border rounded-lg p-3 text-sm text-white placeholder:text-weavrn-muted focus:border-weavrn-accent/50 focus:outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-weavrn-muted block mb-1">Input / instructions (sent as first message)</label>
                      <textarea
                        value={initialMessage}
                        onChange={(e) => setInitialMessage(e.target.value)}
                        placeholder="Paste code, provide a URL, or write detailed instructions..."
                        rows={4}
                        className="w-full bg-weavrn-dark border border-weavrn-border rounded-lg p-3 text-xs font-mono text-white placeholder:text-weavrn-muted focus:border-weavrn-accent/50 focus:outline-none resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-4 text-xs text-weavrn-muted">
                  <span>Price: {listing.price_amount || "Custom"} {listing.price_token}</span>
                  <span>Escrow: {listing.escrow_strategy.replace(/_/g, " ")}</span>
                  {listing.estimated_duration && <span>Est: {listing.estimated_duration}</span>}
                </div>

                {requestError && <p className="text-xs text-red-400">{requestError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={handleRequestService}
                    disabled={requesting || !signer}
                    className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
                  >
                    {requesting ? "Submitting..." : "Submit Request"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 border border-weavrn-border rounded-lg text-sm text-weavrn-muted hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
          <p className="text-sm font-mono">{listing.price_amount || "\u2014"} {listing.price_token}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-xs text-weavrn-muted mb-1">Escrow</p>
          <p className="text-sm font-semibold">{listing.escrow_strategy.replace(/_/g, " ")}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-xs text-weavrn-muted mb-1">Duration</p>
          <p className="text-sm">{listing.estimated_duration || "\u2014"}</p>
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
