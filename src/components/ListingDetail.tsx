"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getListing, createJob, uploadToolInput } from "@/lib/api";
import type { ServiceListing } from "@/lib/api";
import {
  isLegacySchema,
  legacyToJsonSchema,
  schemaToFormFields,
  validateAgainstSchema,
  type FormField,
  type JSONSchema,
  type LegacyInputField,
} from "@/lib/schema-form";
import SchemaForm from "./SchemaForm";

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
  const [createdJobId, setCreatedJobId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  // Generic fallback fields
  const [description, setDescription] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  // Schema-driven form state (flat dot-path keys — see schemaToFormFields)
  const [formState, setFormState] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Coerce legacy → JSON Schema when needed; memoize both the schema and the
  // derived flat field list so SchemaForm sees a stable prop reference.
  const inputSchema = useMemo<JSONSchema | null>(() => {
    const raw = listing?.input_schema;
    if (!raw) return null;
    if (Array.isArray(raw) && isLegacySchema(raw)) {
      return legacyToJsonSchema(raw as unknown as LegacyInputField[]);
    }
    if (typeof raw === "object") {
      return raw as unknown as JSONSchema;
    }
    return null;
  }, [listing?.input_schema]);

  const formFields = useMemo<FormField[] | null>(
    () => (inputSchema ? schemaToFormFields(inputSchema) : null),
    [inputSchema],
  );

  const handleToolInputUpload = useCallback(
    async (_field: FormField, file: File): Promise<string> => {
      if (!signer || !walletAddress) {
        throw new Error("Connect your wallet to upload files");
      }
      const res = await uploadToolInput(signer, walletAddress, listing?.id ?? null, file);
      return res.file_url;
    },
    [signer, walletAddress, listing?.id],
  );

  const handleRequestService = async () => {
    if (!signer || !walletAddress || !listing) return;
    setRequesting(true);
    setRequestError(null);
    setFieldErrors({});
    try {
      // Schema-driven path: validate via ajv. Legacy listings reach here via
      // isLegacySchema + legacyToJsonSchema coercion above.
      if (formFields && inputSchema) {
        const result = validateAgainstSchema(inputSchema, formState);
        if (!result.ok) {
          const nextErrors: Record<string, string> = {};
          for (const e of result.errors) {
            // ajv instancePath is leading-slash, e.g. "/prompt" or
            // "/options/seed". SchemaForm indexes errors by dot-path
            // ("prompt", "options.seed"). Convert.
            const basePath = e.path.startsWith("/")
              ? e.path.slice(1).replace(/\//g, ".")
              : e.path;
            // Required-property errors surface with an empty instancePath
            // and a message of "must have required property '<name>'".
            // Map them onto the missing property so SchemaForm can render
            // the error inline with the field.
            let path = basePath;
            const requiredMatch = /must have required property '([^']+)'/.exec(e.message);
            if (requiredMatch) {
              const name = requiredMatch[1];
              path = basePath ? `${basePath}.${name}` : name;
            }
            if (!nextErrors[path]) nextErrors[path] = e.message || "Invalid value";
          }
          setFieldErrors(nextErrors);
          setRequesting(false);
          return;
        }
      }

      const inputData: Record<string, unknown> | undefined =
        formFields && Object.keys(formState).length > 0 ? { ...formState } : undefined;

      await createJob(signer, walletAddress, {
        listing_id: listing.id,
        provider_wallet: listing.wallet_address,
        title: listing.title,
        description: formFields
          ? `Service request for: ${listing.title}`
          : description.trim() || `Service request for: ${listing.title}`,
        initial_message: formFields ? undefined : initialMessage.trim() || undefined,
        input_data: inputData,
      });

      // Schema-driven listings upload pre-job via uploadToolInput (URLs are
      // already in formState). The non-schema fallback submits with no
      // files, so no post-job upload is needed here.

      setRequested(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
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

                {formFields ? (
                  <SchemaForm
                    fields={formFields}
                    value={formState}
                    onChange={setFormState}
                    errors={fieldErrors}
                    disabled={requesting}
                    onFileUpload={handleToolInputUpload}
                  />
                ) : (
                  /* Generic fallback — no input_schema on this listing */
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
