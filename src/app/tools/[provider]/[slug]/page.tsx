"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JsonRpcSigner } from "ethers";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import SchemaForm from "@/components/SchemaForm";
import ToolOutputView from "@/components/ToolOutputView";
import {
  schemaToFormFields,
  legacyToJsonSchema,
  isLegacySchema,
  validateAgainstSchema,
  type JSONSchema,
  type LegacyInputField,
} from "@/lib/schema-form";
import {
  getTool,
  createJob as apiCreateJob,
  linkJobEscrow as apiLinkJobEscrow,
  getJob as apiGetJob,
  completeJobWithAuth,
  type ToolDetail,
  type Job,
} from "@/lib/api";
import {
  createEscrowETH as contractCreateEscrowETH,
  releaseEscrow as contractReleaseEscrow,
} from "@/lib/contracts";

// ──────────────────────────────────────────────────────────────────────────
// Client abstraction — mirrors the @weavrn/sdk surface described in the spec
// (createJob, createEscrowETH, createEscrowERC20, linkJobEscrow, approveJob,
// subscribe). The real implementation delegates to `api.ts` + `contracts.ts`;
// tests inject a stub. Since the SDK package is not installed in the landing,
// this narrow interface keeps the spec wiring while honoring "don't invent a
// new signed-GET path": `subscribe` polls `GET /jobs/:id` (already a public
// route) for status transitions.
// ──────────────────────────────────────────────────────────────────────────

export type ToolEventKind =
  | "job_delivered"
  | "job_failed"
  | "job_disputed";

export interface ToolEvent {
  type: ToolEventKind;
  jobId: number;
  job?: Job;
  error?: string;
}

export interface ToolDetailClient {
  createJob(args: {
    listing_id?: number;
    provider_wallet: string;
    title: string;
    description?: string;
    initial_message?: string;
    input_data?: Record<string, unknown>;
  }): Promise<{ id: number }>;
  createEscrowETH(args: {
    recipient: string;
    amountEth: string;
    deadlineSeconds: number;
    strategyName: string;
    strategyAddress?: string | null;
    memo: string;
  }): Promise<{ escrowId: number }>;
  createEscrowERC20(args: {
    recipient: string;
    token: string;
    amount: string;
    deadlineSeconds: number;
    strategyName: string;
    strategyAddress?: string | null;
    memo: string;
  }): Promise<{ escrowId: number }>;
  linkJobEscrow(args: { jobId: number; escrowId: number }): Promise<void>;
  getJob(jobId: number): Promise<Job>;
  approveJob(args: { jobId: number; escrowId: number }): Promise<void>;
  subscribe(cb: (event: ToolEvent) => void): () => void;
}

interface LiveClientDeps {
  signer: JsonRpcSigner;
  walletAddress: string;
}

function buildLiveClient(deps: LiveClientDeps): ToolDetailClient {
  const { signer, walletAddress } = deps;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const watched = new Map<number, { lastStatus: string }>();
  const listeners = new Set<(event: ToolEvent) => void>();

  const emit = (event: ToolEvent) => {
    for (const l of Array.from(listeners)) l(event);
  };

  const ensurePollLoop = () => {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      for (const [jobId, state] of Array.from(watched.entries())) {
        try {
          const job = await apiGetJob(jobId);
          if (job.status === state.lastStatus) continue;
          state.lastStatus = job.status;
          if (job.status === "delivered") {
            emit({ type: "job_delivered", jobId, job });
          } else if (job.status === "cancelled") {
            emit({ type: "job_failed", jobId, job, error: "Job cancelled" });
          } else if (job.status === "disputed") {
            emit({ type: "job_disputed", jobId, job });
          }
        } catch {
          // transient polling errors are swallowed
        }
      }
      if (watched.size === 0 && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }, 3000);
  };

  return {
    async createJob(args) {
      const job = await apiCreateJob(signer, walletAddress, args);
      watched.set(job.id, { lastStatus: job.status });
      return { id: job.id };
    },
    async createEscrowETH(args) {
      const { escrowId } = await contractCreateEscrowETH(
        signer,
        args.recipient,
        args.amountEth,
        args.deadlineSeconds,
        args.strategyName,
        args.memo,
        args.strategyAddress ?? null,
      );
      return { escrowId };
    },
    async createEscrowERC20() {
      // Phase 2 tool listings do not wire ERC-20 escrow — callers must pre-flight
      // this via `pricingIsETH`. We throw here so the UI surfaces a clear error
      // instead of silently mis-funding.
      throw new Error("ERC-20 escrow not supported for tool listings in this phase");
    },
    async linkJobEscrow(args) {
      // Indexer-lag retry loop mirroring `JobQueue.tsx` confirmFund().
      let lastErr: unknown;
      for (let i = 0; i < 12; i += 1) {
        const delay = 3000 + i * 2000;
        await new Promise((r) => setTimeout(r, delay));
        try {
          await apiLinkJobEscrow(signer, walletAddress, args.jobId, args.escrowId);
          return;
        } catch (err) {
          lastErr = err;
        }
      }
      throw new Error(
        `Escrow created on-chain but linking timed out. Contact support with escrow ID ${args.escrowId}.` +
          (lastErr instanceof Error ? ` (${lastErr.message})` : ""),
      );
    },
    async getJob(jobId) {
      return apiGetJob(jobId);
    },
    async approveJob(args) {
      await contractReleaseEscrow(signer, args.escrowId);
      const completed = await completeJobWithAuth(signer, walletAddress, args.jobId);
      if (!completed) {
        throw new Error("Escrow released, but completing the job failed. Try again.");
      }
    },
    subscribe(cb) {
      listeners.add(cb);
      ensurePollLoop();
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      };
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function truncAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function humanizeStrategy(strategy: string | null | undefined): string {
  if (!strategy) return "All or nothing";
  if (strategy === "all_or_nothing") return "All or nothing";
  return strategy
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function humanizeDeadline(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  if (seconds % 3600 === 0) {
    const h = seconds / 3600;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  if (seconds % 60 === 0) {
    const m = seconds / 60;
    return m === 1 ? "1 minute" : `${m} minutes`;
  }
  return `${seconds}s`;
}

function humanizeLatencyMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatSuccessRate(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function prettyCategory(cat: string | null | undefined): string {
  if (!cat) return "";
  return cat.replace(/_/g, " ");
}

function modeBadgeClasses(mode: ToolDetail["execution_mode"]): string {
  switch (mode) {
    case "hosted":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "byo":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-weavrn-surface text-weavrn-muted border-weavrn-border";
  }
}

function modeLabel(mode: ToolDetail["execution_mode"]): string {
  if (mode === "byo") return "BYO";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function starRow(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

function pricingIsETH(tool: ToolDetail): boolean {
  const token = (tool.price_token || "").toUpperCase();
  return token === "" || token === "ETH";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  const anyErr = err as { message?: string; reason?: string };
  return anyErr?.message || anyErr?.reason || "Something went wrong";
}

// ──────────────────────────────────────────────────────────────────────────
// ToolDetailView — extracted for testability. Accepts a pre-loaded
// ToolDetail + optional client stub so tests can exercise it without a
// Next.js route shell or a live signer.
// ──────────────────────────────────────────────────────────────────────────

export type ToolDetailStatus =
  | "idle"
  | "submitting"
  | "funding"
  | "linking"
  | "waiting"
  | "delivered"
  | "releasing"
  | "done"
  | "failed";

export interface ToolDetailViewProps {
  tool: ToolDetail;
  walletAddress?: string | null;
  signer?: JsonRpcSigner | null;
  client?: ToolDetailClient;
  onConnectRequest?: () => void;
  // Testing hooks (do not mutate at runtime in prod):
  initialStatus?: ToolDetailStatus;
  initialDeliverable?: Job["deliverable_data"];
  initialJobId?: number;
  initialEscrowId?: number;
}

export function ToolDetailView(props: ToolDetailViewProps): JSX.Element {
  const {
    tool,
    walletAddress,
    signer,
    client: injectedClient,
    onConnectRequest,
    initialStatus = "idle",
    initialDeliverable = null,
    initialJobId = null,
    initialEscrowId = null,
  } = props;

  const [formState, setFormState] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<ToolDetailStatus>(initialStatus);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(initialJobId);
  const [escrowId, setEscrowId] = useState<number | null>(initialEscrowId);
  const [deliverable, setDeliverable] = useState<Job["deliverable_data"]>(
    initialDeliverable,
  );
  const [deadlineRemaining, setDeadlineRemaining] = useState<number | null>(
    null,
  );
  const [disputeNotice, setDisputeNotice] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // Derive JSON Schema (legacy-aware) and FormField list.
  const inputSchema = useMemo<JSONSchema | null>(() => {
    const raw = tool.input_schema;
    if (raw == null) return null;
    if (Array.isArray(raw) && isLegacySchema(raw)) {
      return legacyToJsonSchema(raw as LegacyInputField[]);
    }
    if (typeof raw === "object") {
      return raw as JSONSchema;
    }
    return null;
  }, [tool.input_schema]);

  const formFields = useMemo(
    () => (inputSchema ? schemaToFormFields(inputSchema) : []),
    [inputSchema],
  );

  const outputSchema = useMemo<JSONSchema | undefined>(() => {
    const raw = tool.output_schema;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as JSONSchema;
    }
    return undefined;
  }, [tool.output_schema]);

  const primaryLabel =
    tool.execution_mode === "manual" ? "Request service" : "Run tool";

  // Timeout + SSE cleanup refs so we can cancel on unmount / reset.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);
  const deadlineTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupWait = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    if (deadlineTickRef.current) {
      clearInterval(deadlineTickRef.current);
      deadlineTickRef.current = null;
    }
  }, []);

  useEffect(() => cleanupWait, [cleanupWait]);

  const resetToIdle = useCallback(() => {
    cleanupWait();
    setStatus("idle");
    setErrorText(null);
    setDisputeNotice(null);
    setDeadlineRemaining(null);
    setDeliverable(null);
    setJobId(null);
    setEscrowId(null);
  }, [cleanupWait]);

  const handleSubmit = useCallback(async () => {
    setErrorText(null);
    setDisputeNotice(null);
    setFieldErrors({});

    if (!signer || !walletAddress) {
      onConnectRequest?.();
      setErrorText("Connect your wallet to continue.");
      return;
    }
    if (walletAddress.toLowerCase() === tool.wallet_address.toLowerCase()) {
      setErrorText("You can't run your own tool listing.");
      return;
    }
    if (!pricingIsETH(tool)) {
      setErrorText(
        `ERC-20 pricing (${tool.price_token}) is not supported on this page yet.`,
      );
      return;
    }
    if (!tool.price_amount) {
      setErrorText("This listing has no price configured.");
      return;
    }

    // Input validation against JSON Schema.
    if (inputSchema) {
      const result = validateAgainstSchema(inputSchema, formState);
      if (!result.ok) {
        const next: Record<string, string> = {};
        for (const e of result.errors) {
          // Ajv instancePath looks like "/name" or "/nested/field". Map to
          // the dotted FormField path used by SchemaForm.
          const path = (e.path || "").replace(/^\//, "").replace(/\//g, ".");
          const key = path || "_root";
          if (!next[key]) next[key] = e.message || "Invalid value";
        }
        setFieldErrors(next);
        setErrorText("Please fix the highlighted fields.");
        return;
      }
    }

    const client =
      injectedClient ?? buildLiveClient({ signer, walletAddress });

    setStatus("submitting");
    let localJobId: number | null = null;
    let localEscrowId: number | null = null;
    try {
      const job = await client.createJob({
        listing_id: tool.id,
        provider_wallet: tool.wallet_address,
        title: `tool:${tool.mcp_tool_slug}`,
        description: `Tool invocation: ${tool.title}`,
        input_data:
          formState && Object.keys(formState).length > 0 ? formState : undefined,
        initial_message: `Tool request: ${tool.mcp_tool_slug}`,
      });
      localJobId = job.id;
      if (!mountedRef.current) return;
      setJobId(localJobId);

      setStatus("funding");
      const deadlineSeconds = tool.default_deadline_seconds ?? 300;
      const escrow = await client.createEscrowETH({
        recipient: tool.wallet_address,
        amountEth: tool.price_amount,
        deadlineSeconds,
        strategyName: tool.escrow_strategy || "all_or_nothing",
        memo: `tool-${localJobId}`,
      });
      localEscrowId = escrow.escrowId;
      if (!mountedRef.current) return;
      setEscrowId(localEscrowId);

      setStatus("linking");
      await client.linkJobEscrow({
        jobId: localJobId,
        escrowId: localEscrowId,
      });
      if (!mountedRef.current) return;

      // Waiting for delivery via subscribe + timeout.
      setStatus("waiting");
      const timeoutMs = (tool.timeout_seconds + 30) * 1000;
      const startedAt = Date.now();
      setDeadlineRemaining(Math.max(0, Math.floor(timeoutMs / 1000)));
      deadlineTickRef.current = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((timeoutMs - (Date.now() - startedAt)) / 1000),
        );
        setDeadlineRemaining(remaining);
      }, 1000);

      const unsub = client.subscribe((event) => {
        if (!mountedRef.current) return;
        if (event.jobId !== localJobId) return;
        if (event.type === "job_delivered") {
          cleanupWait();
          const data = event.job?.deliverable_data ?? null;
          setDeliverable(data);
          setStatus("delivered");
        } else if (event.type === "job_failed") {
          cleanupWait();
          setErrorText(event.error || "Tool execution failed.");
          setStatus("failed");
        } else if (event.type === "job_disputed") {
          cleanupWait();
          setDisputeNotice(
            "This job has been disputed. An admin will review it.",
          );
          setStatus("failed");
        }
      });
      unsubRef.current = unsub;

      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        cleanupWait();
        setErrorText("Timed out waiting for delivery.");
        setStatus("failed");
      }, timeoutMs);
    } catch (err) {
      cleanupWait();
      setErrorText(errorMessage(err));
      setStatus("failed");
    }
  }, [
    cleanupWait,
    formState,
    injectedClient,
    inputSchema,
    onConnectRequest,
    signer,
    tool,
    walletAddress,
  ]);

  const handleRelease = useCallback(async () => {
    if (!signer || !walletAddress) {
      onConnectRequest?.();
      return;
    }
    if (jobId == null || escrowId == null) {
      setErrorText("Missing job or escrow reference.");
      return;
    }
    const client = injectedClient ?? buildLiveClient({ signer, walletAddress });
    setErrorText(null);
    setStatus("releasing");
    try {
      await client.approveJob({ jobId, escrowId });
      if (!mountedRef.current) return;
      setStatus("done");
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorText(errorMessage(err));
      setStatus("delivered");
    }
  }, [escrowId, injectedClient, jobId, onConnectRequest, signer, walletAddress]);

  // Flags used to decide which panel renders below the form.
  const busy =
    status === "submitting" ||
    status === "funding" ||
    status === "linking" ||
    status === "waiting" ||
    status === "releasing";

  const formDisabled = busy || status === "delivered" || status === "done";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link + hero */}
      <div>
        <a
          href="/tools"
          className="text-xs text-weavrn-muted hover:text-weavrn-accent transition-colors"
        >
          ← Back to tools
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 glow-card rounded-xl p-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            {tool.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {tool.tool_category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent">
                {prettyCategory(tool.tool_category)}
              </span>
            )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${modeBadgeClasses(tool.execution_mode)}`}
              data-testid="tool-mode-badge"
            >
              {modeLabel(tool.execution_mode)}
            </span>
            {tool.output_content_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted">
                {tool.output_content_type}
              </span>
            )}
          </div>
          <p className="text-sm text-weavrn-muted">{tool.description}</p>
        </div>

        <div className="glow-card rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-2">
            Provider
          </p>
          <p className="text-sm font-semibold truncate">
            {tool.agent.name || truncAddr(tool.agent.wallet_address)}
          </p>
          <p className="text-[11px] font-mono text-weavrn-muted/70 mb-3">
            {truncAddr(tool.agent.wallet_address)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {tool.agent.trust_score != null ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent">
                trust {tool.agent.trust_score.toFixed(0)}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted">
                trust —
              </span>
            )}
            {tool.agent.active ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                active
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                inactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible model description */}
      {tool.description_for_model && (
        <details className="glow-card rounded-xl p-4">
          <summary className="cursor-pointer text-xs font-semibold text-weavrn-muted hover:text-white">
            Model description
          </summary>
          <p className="mt-3 text-xs whitespace-pre-wrap text-weavrn-muted">
            {tool.description_for_model}
          </p>
        </details>
      )}

      {/* Pricing block */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glow-card rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-1">
            Price
          </p>
          <p className="text-sm font-mono">
            {tool.price_amount ? `${tool.price_amount} ${tool.price_token || "ETH"}` : "—"}
          </p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-1">
            Escrow
          </p>
          <p className="text-sm">{humanizeStrategy(tool.escrow_strategy)}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-1">
            Deadline
          </p>
          <p className="text-sm">{humanizeDeadline(tool.default_deadline_seconds)}</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glow-card rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-1">
            Calls
          </p>
          <p className="text-sm font-mono">{tool.call_count.toLocaleString()}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-1">
            Success rate
          </p>
          <p className="text-sm font-mono">{formatSuccessRate(tool.success_rate)}</p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-1">
            p50 latency
          </p>
          <p className="text-sm font-mono">
            {humanizeLatencyMs(tool.stats?.p50_latency_ms)}
          </p>
        </div>
        <div className="glow-card rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-weavrn-muted mb-1">
            p95 latency
          </p>
          <p className="text-sm font-mono">
            {humanizeLatencyMs(tool.stats?.p95_latency_ms)}
          </p>
        </div>
      </div>

      {/* Form + submit */}
      <div className="glow-card rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Input</h3>
        {formFields.length === 0 ? (
          <p className="text-xs text-weavrn-muted mb-4">
            This tool has no input schema — click the button below to request service.
          </p>
        ) : (
          <SchemaForm
            fields={formFields}
            value={formState}
            onChange={setFormState}
            errors={fieldErrors}
            disabled={formDisabled}
          />
        )}

        {errorText && status === "failed" && (
          <div
            className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 mb-3"
            role="alert"
            data-testid="tool-error"
          >
            {errorText}
          </div>
        )}
        {errorText && status !== "failed" && (
          <p className="text-xs text-red-400 mb-3">{errorText}</p>
        )}
        {disputeNotice && (
          <div
            className="rounded-md bg-orange-500/10 border border-orange-500/20 p-3 text-xs text-orange-400 mb-3"
            role="status"
          >
            {disputeNotice}
          </div>
        )}

        <div className="flex items-center gap-3">
          {status === "idle" || status === "failed" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!signer || !walletAddress}
              data-testid="tool-run-btn"
              className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
            >
              {status === "failed" ? "Run again" : primaryLabel}
            </button>
          ) : busy ? (
            <button
              type="button"
              disabled
              data-testid="tool-run-btn"
              className="px-4 py-2.5 bg-weavrn-accent/50 text-black rounded-lg text-sm font-semibold"
            >
              {status === "submitting" && "Submitting…"}
              {status === "funding" && "Funding escrow…"}
              {status === "linking" && "Linking escrow…"}
              {status === "waiting" && (
                <span>
                  Running…
                  {deadlineRemaining != null && (
                    <span className="ml-2 font-mono text-[11px] opacity-80">
                      {deadlineRemaining}s
                    </span>
                  )}
                </span>
              )}
              {status === "releasing" && "Releasing…"}
            </button>
          ) : null}
          {(status === "failed" || status === "done") && (
            <button
              type="button"
              onClick={resetToIdle}
              className="px-4 py-2.5 border border-weavrn-border text-weavrn-muted hover:text-white rounded-lg text-sm transition-colors"
            >
              Reset
            </button>
          )}
          {!signer && (
            <span className="text-[11px] text-weavrn-muted">
              Connect your wallet to {primaryLabel.toLowerCase()}.
            </span>
          )}
        </div>
      </div>

      {/* Output + release */}
      {(status === "delivered" ||
        status === "releasing" ||
        status === "done") && (
        <div className="glow-card rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Output</h3>
          <ToolOutputView
            deliverableData={deliverable}
            outputSchema={outputSchema}
            contentType={tool.output_content_type || undefined}
          />
          {status === "delivered" && (
            <button
              type="button"
              onClick={handleRelease}
              disabled={!signer}
              data-testid="tool-release-btn"
              className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
            >
              Release & complete
            </button>
          )}
          {status === "releasing" && (
            <p className="text-xs text-weavrn-muted">Releasing escrow…</p>
          )}
          {status === "done" && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-400">
              Completed — escrow released and job finalized.
            </div>
          )}
        </div>
      )}

      {/* Reviews panel */}
      <div className="glow-card rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-3">Reviews</h3>
        {!tool.recent_reviews || tool.recent_reviews.length === 0 ? (
          <p className="text-xs text-weavrn-muted">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {tool.recent_reviews.slice(0, 5).map((r, idx) => (
              <li
                key={`${r.reviewer_wallet}-${r.created_at}-${idx}`}
                className="p-3 rounded-lg bg-weavrn-dark border border-weavrn-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-yellow-400 text-xs"
                    aria-label={`${r.rating} out of 5 stars`}
                  >
                    {starRow(r.rating)}
                  </span>
                  <span className="text-[10px] text-weavrn-muted font-mono">
                    {truncAddr(r.reviewer_wallet)} · {relativeTime(r.created_at)}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-xs text-weavrn-muted whitespace-pre-wrap">
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Outer page — fetches the tool, wires wallet state via AppHeader.
// ──────────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { provider: string; slug: string };
}

export default function ToolDetailPage({ params }: PageProps): JSX.Element {
  const { provider, slug } = params;
  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  const handleConnect = useCallback((addr: string, s: JsonRpcSigner) => {
    setAddress(addr);
    setSigner(s);
  }, []);

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    (async () => {
      try {
        const data = await getTool(provider, slug);
        if (cancelled) return;
        setTool(data);
      } catch (err) {
        if (cancelled) return;
        const msg = errorMessage(err);
        if (/not found/i.test(msg)) {
          setNotFound(true);
        } else {
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, slug]);

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <AppHeader
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        address={address}
      />

      <div className="relative z-10 px-6 py-16">
        {loading ? (
          <p className="text-center text-weavrn-muted py-20">Loading tool…</p>
        ) : notFound ? (
          <div className="max-w-md mx-auto glow-card rounded-xl p-10 text-center">
            <p className="text-sm text-weavrn-muted mb-4">Tool not found</p>
            <a
              href="/tools"
              className="text-xs text-weavrn-accent hover:underline"
            >
              Back to tools
            </a>
          </div>
        ) : loadError ? (
          <div className="max-w-md mx-auto glow-card rounded-xl p-10 text-center">
            <p className="text-sm text-red-400 mb-4">{loadError}</p>
            <a
              href="/tools"
              className="text-xs text-weavrn-accent hover:underline"
            >
              Back to tools
            </a>
          </div>
        ) : tool ? (
          <ToolDetailView
            tool={tool}
            walletAddress={address}
            signer={signer}
          />
        ) : null}
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}
