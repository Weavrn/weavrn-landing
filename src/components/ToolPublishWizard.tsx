"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { JsonRpcSigner } from "ethers";
import {
  API_URL,
  createListing,
  getListing,
  getTool,
  getToolConfig,
  updateListing,
} from "../lib/api";
import type { InputField, ServiceListing } from "../lib/api";
import {
  schemaToFormFields,
  type FormField,
  type JSONSchema,
} from "../lib/schema-form";
import {
  TOOL_CATEGORIES,
  getDefaultContentTypeForCategory,
  getOutputPresetForCategory,
  getPresetForCategory,
  type ToolCategory,
} from "../lib/tool-presets";
import SchemaForm from "./SchemaForm";
import ToolOutputView from "./ToolOutputView";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

type SchemaMode = "template" | "builder" | "raw";
type ExecutionMode = "manual" | "hosted" | "byo";
type HostedKind = "llm" | "script" | "container";
type PricingType = "fixed" | "hourly" | "custom";
type EscrowStrategy = "all_or_nothing" | "milestone" | "trickle";

type BuilderFieldType =
  | "text"
  | "textarea"
  | "select"
  | "code"
  | "url"
  | "email"
  | "number"
  | "checkbox"
  | "file";

export interface BuilderRow {
  id: string;
  name: string;
  label: string;
  type: BuilderFieldType;
  required: boolean;
  options?: string;
  min?: string;
  max?: string;
  accept?: string;
}

export interface ToolDraft {
  // Step 1
  title: string;
  mcp_tool_slug: string;
  description: string;
  description_for_model: string;
  tool_category: ToolCategory;
  tags: string[];

  // Step 2
  input_schema: JSONSchema | null;
  input_schema_mode: SchemaMode;
  input_builder_rows: BuilderRow[];
  input_raw_text: string;

  // Step 3
  output_schema: JSONSchema | null;
  output_schema_mode: SchemaMode;
  output_builder_rows: BuilderRow[];
  output_raw_text: string;
  output_content_type: string;

  // Step 4
  pricing_type: PricingType;
  price_amount: string;
  price_token: string;
  escrow_strategy: EscrowStrategy;
  default_deadline_seconds: number;

  // Step 5
  execution_mode: ExecutionMode;
  hosted_kind: HostedKind;
  runner_config: Record<string, unknown> | null;
  runner_ref: string | null;
  endpoint_url: string | null;
  endpoint_secret: string | null;

  // Limits
  timeout_seconds: number;
  max_input_bytes: number;
  max_output_bytes: number;
  max_calls_per_minute: number | null;
  max_calls_per_day: number | null;
  auto_release_on_delivery: boolean;
}

interface Props {
  walletAddress: string | null;
  signer: JsonRpcSigner | null;
  editListingId?: number | null;
  searchParams?: URLSearchParams | null;
  /**
   * Wallet to publish under. Defaults to `walletAddress` (the connected owner).
   * When set to a different address (a hosted agent wallet owned by the
   * connected wallet), the server persists the listing under that wallet
   * via `agent_wallet` and checks its on-chain registration instead of the
   * owner's.
   */
  publishAsWallet?: string | null;
}

// ──────────────────────────────────────────────────────────────────────────
// Constants + helpers
// ──────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9-]{2,40}$/;

const CONTENT_TYPE_OPTIONS = [
  "text",
  "json",
  "image/png",
  "image/jpeg",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "application/octet-stream",
] as const;

const BUILDER_TYPE_OPTIONS: BuilderFieldType[] = [
  "text",
  "textarea",
  "select",
  "code",
  "url",
  "email",
  "number",
  "checkbox",
  "file",
];

const STEPS = [
  "Basics",
  "Input Schema",
  "Output Schema",
  "Pricing",
  "Execution",
  "Review",
] as const;

const LS_PREFIX = "weavrn:tool-wizard:";

// Styling constants — keep in sync with ListingDetail / tools page.
const INPUT_CLASS =
  "w-full rounded-lg bg-weavrn-dark border border-weavrn-border px-3 py-2 text-sm text-white placeholder:text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50 disabled:opacity-50";
const TEXTAREA_CLASS = `${INPUT_CLASS} font-mono text-xs resize-y min-h-[120px]`;
const LABEL_CLASS = "block text-xs font-medium text-weavrn-muted mb-1";
const SECTION_CLASS = "glow-card rounded-xl p-6 space-y-5";
const BUTTON_PRIMARY =
  "px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const BUTTON_SECONDARY =
  "px-4 py-2.5 border border-weavrn-border text-gray-200 bg-weavrn-surface hover:text-white hover:border-gray-500 rounded-lg text-sm transition-colors disabled:opacity-40";
const TAB_CLASS = (active: boolean, disabled = false) =>
  `px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
    active
      ? "border-weavrn-accent text-weavrn-accent bg-weavrn-accent/10"
      : "border-weavrn-border text-gray-300 bg-weavrn-surface"
  } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:text-white"}`;

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function defaultDeadlineFor(mode: ExecutionMode): number {
  if (mode === "hosted") return 300;
  if (mode === "byo") return 1800;
  return 3600;
}

function generateHmacSecret(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeInitialDraft(): ToolDraft {
  const execution_mode: ExecutionMode = "manual";
  return {
    title: "",
    mcp_tool_slug: "",
    description: "",
    description_for_model: "",
    tool_category: "other",
    tags: [],
    input_schema: getPresetForCategory("other"),
    input_schema_mode: "template",
    input_builder_rows: [],
    input_raw_text: "",
    output_schema: getOutputPresetForCategory("other"),
    output_schema_mode: "template",
    output_builder_rows: [],
    output_raw_text: "",
    output_content_type: getDefaultContentTypeForCategory("other"),
    pricing_type: "fixed",
    price_amount: "0.001",
    price_token: "ETH",
    escrow_strategy: "all_or_nothing",
    default_deadline_seconds: defaultDeadlineFor(execution_mode),
    execution_mode,
    hosted_kind: "llm",
    runner_config: null,
    runner_ref: null,
    endpoint_url: null,
    endpoint_secret: null,
    timeout_seconds: 60,
    max_input_bytes: 1048576,
    max_output_bytes: 26214400,
    max_calls_per_minute: null,
    max_calls_per_day: null,
    auto_release_on_delivery: false,
  };
}

// Builder ↔ JSON Schema conversion.
function rowsToSchema(rows: BuilderRow[]): JSONSchema {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];
  for (const r of rows) {
    if (!r.name) continue;
    let prop: JSONSchema = {};
    switch (r.type) {
      case "text":
        prop = { type: "string" };
        break;
      case "textarea":
        prop = { type: "string", format: "textarea" };
        break;
      case "code":
        prop = { type: "string", format: "code" };
        break;
      case "url":
        prop = { type: "string", format: "uri" };
        break;
      case "email":
        prop = { type: "string", format: "email" };
        break;
      case "select": {
        const opts = (r.options ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        prop = { type: "string", enum: opts };
        break;
      }
      case "number": {
        const p: JSONSchema = { type: "number" };
        if (r.min) p.minimum = Number(r.min);
        if (r.max) p.maximum = Number(r.max);
        prop = p;
        break;
      }
      case "checkbox":
        prop = { type: "boolean" };
        break;
      case "file":
        prop = {
          type: "string",
          contentEncoding: "base64",
          contentMediaType: r.accept || "application/octet-stream",
        };
        break;
      default:
        prop = { type: "string" };
    }
    if (r.label) (prop as Record<string, unknown>).title = r.label;
    properties[r.name] = prop;
    if (r.required) required.push(r.name);
  }
  return { type: "object", properties, required };
}

function sampleDeliverableFor(
  toolSlug: string,
  contentType: string,
  outputSchema: JSONSchema | null,
): unknown {
  const kind = contentType.toLowerCase();
  let output: unknown = { result: "sample output" };
  let output_url: string | undefined;

  if (kind === "text") {
    output = "Sample tool output text.";
  } else if (kind === "json" || kind === "application/json") {
    if (outputSchema && isPlainObject(outputSchema) && isPlainObject(outputSchema.properties)) {
      const props = outputSchema.properties as Record<string, unknown>;
      const obj: Record<string, unknown> = {};
      for (const [k] of Object.entries(props)) obj[k] = "sample";
      output = obj;
    } else {
      output = { sample: "json" };
    }
  } else if (kind.startsWith("image/")) {
    output_url =
      "https://placehold.co/512x512/1a1a2e/00d4aa?text=Sample+Output";
    output = { image_url: output_url };
  } else if (kind.startsWith("audio/")) {
    output_url = "https://example.com/sample.mp3";
    output = { audio_url: output_url };
  } else if (kind.startsWith("video/")) {
    output_url = "https://example.com/sample.mp4";
    output = { video_url: output_url };
  } else if (kind === "application/octet-stream") {
    output_url = "https://example.com/sample.bin";
    output = { output_url };
  }

  return {
    tool_slug: toolSlug || "demo",
    output,
    output_url,
    content_type: contentType,
    format: "tool_output_v1",
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Slug availability helper: true = taken, false = available.
async function checkSlugTaken(wallet: string, slug: string): Promise<"taken" | "available" | "error"> {
  try {
    await getTool(wallet, slug);
    return "taken";
  } catch (err) {
    const msg = (err as Error).message || "";
    if (/not found|404/i.test(msg)) return "available";
    return "error";
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Step 1 — Basics
// ──────────────────────────────────────────────────────────────────────────

interface StepProps {
  draft: ToolDraft;
  // Accept both the value and updater forms of React's setState so child
  // handlers that call setDraft twice in a row (e.g. mode + schema on a
  // tab click, or rows + schema in updateRow) can use the updater form
  // and avoid stale-closure overwrites when React batches updates.
  setDraft: Dispatch<SetStateAction<ToolDraft>>;
}

interface BasicsStepProps extends StepProps {
  walletAddress: string | null;
  slugState: SlugState;
  setSlugState: (s: SlugState) => void;
}

type SlugState =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "error"; message: string };

export function WizardBasicsStep({
  draft,
  setDraft,
  walletAddress,
  slugState,
  setSlugState,
}: BasicsStepProps): JSX.Element {
  // Debounced slug uniqueness check.
  useEffect(() => {
    if (!draft.mcp_tool_slug) {
      setSlugState({ status: "idle" });
      return;
    }
    if (!SLUG_REGEX.test(draft.mcp_tool_slug)) {
      setSlugState({
        status: "invalid",
        message: "Slug must be 2-40 lowercase letters, digits, or dashes.",
      });
      return;
    }
    if (!walletAddress) {
      setSlugState({ status: "idle" });
      return;
    }
    setSlugState({ status: "checking" });
    const handle = setTimeout(async () => {
      const result = await checkSlugTaken(walletAddress, draft.mcp_tool_slug);
      if (result === "taken") {
        setSlugState({ status: "taken" });
      } else if (result === "available") {
        setSlugState({ status: "available" });
      } else {
        setSlugState({
          status: "error",
          message: "Could not verify slug uniqueness. You can still continue.",
        });
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [draft.mcp_tool_slug, walletAddress, setSlugState]);

  const slugMessage = (() => {
    switch (slugState.status) {
      case "invalid":
        return { text: slugState.message, cls: "text-red-400" };
      case "checking":
        return { text: "Checking availability...", cls: "text-weavrn-muted" };
      case "available":
        return { text: "Available", cls: "text-weavrn-accent" };
      case "taken":
        return { text: "Slug taken for your wallet", cls: "text-red-400" };
      case "error":
        return { text: slugState.message, cls: "text-yellow-400" };
      default:
        return null;
    }
  })();

  return (
    <div className={SECTION_CLASS} data-testid="basics-step">
      <h2 className="text-lg font-semibold">Basics</h2>
      <p className="text-xs text-weavrn-muted">
        Tell consumers what the tool is called, what it does, and how models
        should understand it.
      </p>

      <div>
        <label className={LABEL_CLASS} htmlFor="wiz-title">
          Title
        </label>
        <input
          id="wiz-title"
          className={INPUT_CLASS}
          placeholder="Image Generator"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="wiz-slug">
          MCP tool slug
        </label>
        <input
          id="wiz-slug"
          className={INPUT_CLASS}
          placeholder="image-gen"
          value={draft.mcp_tool_slug}
          onChange={(e) =>
            setDraft({ ...draft, mcp_tool_slug: e.target.value.toLowerCase() })
          }
          aria-describedby="wiz-slug-msg"
        />
        {slugMessage && (
          <p
            id="wiz-slug-msg"
            className={`mt-1 text-[11px] ${slugMessage.cls}`}
            data-testid="slug-status"
          >
            {slugMessage.text}
          </p>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="wiz-desc">
          Description
        </label>
        <textarea
          id="wiz-desc"
          rows={3}
          className={INPUT_CLASS}
          placeholder="A short, human-readable description shown on the tool directory."
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="wiz-desc-model">
          Description for model
        </label>
        <textarea
          id="wiz-desc-model"
          rows={4}
          className={INPUT_CLASS}
          placeholder="A richer description aimed at LLM consumers — inputs, side-effects, constraints."
          value={draft.description_for_model}
          onChange={(e) =>
            setDraft({ ...draft, description_for_model: e.target.value })
          }
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="wiz-cat">
          Tool category
        </label>
        <select
          id="wiz-cat"
          className={INPUT_CLASS}
          value={draft.tool_category}
          onChange={(e) => {
            const cat = e.target.value as ToolCategory;
            // When category changes, if user is still on template mode, swap
            // the preset. Otherwise leave schemas intact.
            const nextDraft: ToolDraft = { ...draft, tool_category: cat };
            if (draft.input_schema_mode === "template") {
              nextDraft.input_schema = getPresetForCategory(cat);
            }
            if (draft.output_schema_mode === "template") {
              nextDraft.output_schema = getOutputPresetForCategory(cat);
              nextDraft.output_content_type = getDefaultContentTypeForCategory(cat);
            }
            setDraft(nextDraft);
          }}
        >
          {TOOL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 2 + 3 shared schema editor
// ──────────────────────────────────────────────────────────────────────────

interface SchemaEditorProps {
  title: string;
  category: ToolCategory;
  mode: SchemaMode;
  setMode: (m: SchemaMode) => void;
  schema: JSONSchema | null;
  setSchema: (s: JSONSchema | null) => void;
  builderRows: BuilderRow[];
  setBuilderRows: (rows: BuilderRow[]) => void;
  rawText: string;
  setRawText: (s: string) => void;
  presetFn: (cat: ToolCategory) => JSONSchema;
  testIdPrefix: string;
}

function SchemaEditor({
  title,
  category,
  mode,
  setMode,
  schema,
  setSchema,
  builderRows,
  setBuilderRows,
  rawText,
  setRawText,
  presetFn,
  testIdPrefix,
}: SchemaEditorProps): JSX.Element {
  const [rawError, setRawError] = useState<string | null>(null);

  // Validate raw JSON on blur.
  const handleRawBlur = () => {
    if (!rawText.trim()) {
      setSchema(null);
      setRawError(null);
      return;
    }
    try {
      const parsed = JSON.parse(rawText);
      if (!isPlainObject(parsed)) throw new Error("Schema must be a JSON object");
      // Validate by trying to convert to form fields (catches invalid
      // subsets).
      schemaToFormFields(parsed as JSONSchema);
      setSchema(parsed as JSONSchema);
      setRawError(null);
    } catch (err) {
      setRawError((err as Error).message || "Invalid JSON");
    }
  };

  const addRow = () => {
    setBuilderRows([
      ...builderRows,
      {
        id: rid(),
        name: "",
        label: "",
        type: "text",
        required: false,
      },
    ]);
  };

  const updateRow = (id: string, patch: Partial<BuilderRow>) => {
    const next = builderRows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setBuilderRows(next);
    setSchema(rowsToSchema(next));
  };

  const removeRow = (id: string) => {
    const next = builderRows.filter((r) => r.id !== id);
    setBuilderRows(next);
    setSchema(rowsToSchema(next));
  };

  return (
    <div className={SECTION_CLASS} data-testid={`${testIdPrefix}-step`}>
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="flex gap-2" role="tablist">
        {(["template", "builder", "raw"] as SchemaMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={TAB_CLASS(mode === m)}
            onClick={() => {
              setMode(m);
              if (m === "template") {
                setSchema(presetFn(category));
              } else if (m === "raw") {
                setRawText(JSON.stringify(schema ?? presetFn(category), null, 2));
              }
            }}
          >
            {m === "raw" ? "Raw JSON" : m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {mode === "template" && (
        <div>
          <p className="text-xs text-weavrn-muted mb-2">
            Starts from the {category.replace(/_/g, " ")} preset. Switch to
            Builder or Raw to customize.
          </p>
          <pre className="text-xs font-mono text-gray-300 bg-weavrn-dark border border-weavrn-border rounded-lg p-3 overflow-auto max-h-64">
            {JSON.stringify(schema ?? {}, null, 2)}
          </pre>
        </div>
      )}

      {mode === "builder" && (
        <div className="space-y-3">
          {builderRows.length === 0 && (
            <p className="text-xs text-weavrn-muted">
              No fields yet. Add your first input field.
            </p>
          )}
          {builderRows.map((row) => (
            <div
              key={row.id}
              className="border border-weavrn-border rounded-lg p-3 space-y-2"
              data-testid={`${testIdPrefix}-builder-row`}
            >
              <div className="flex gap-2 flex-wrap">
                <input
                  className={`${INPUT_CLASS} flex-1 min-w-[120px]`}
                  placeholder="field_name"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                />
                <input
                  className={`${INPUT_CLASS} flex-1 min-w-[120px]`}
                  placeholder="Label"
                  value={row.label}
                  onChange={(e) => updateRow(row.id, { label: e.target.value })}
                />
                <select
                  className={`${INPUT_CLASS} w-32`}
                  value={row.type}
                  onChange={(e) =>
                    updateRow(row.id, {
                      type: e.target.value as BuilderFieldType,
                    })
                  }
                >
                  {BUILDER_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1 text-xs text-weavrn-muted">
                  <input
                    type="checkbox"
                    checked={row.required}
                    onChange={(e) =>
                      updateRow(row.id, { required: e.target.checked })
                    }
                  />
                  required
                </label>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => removeRow(row.id)}
                  aria-label={`Remove ${row.name || "field"}`}
                >
                  remove
                </button>
              </div>

              {row.type === "select" && (
                <input
                  className={INPUT_CLASS}
                  placeholder="Comma-separated options, e.g. red, green, blue"
                  value={row.options ?? ""}
                  onChange={(e) =>
                    updateRow(row.id, { options: e.target.value })
                  }
                />
              )}
              {row.type === "number" && (
                <div className="flex gap-2">
                  <input
                    className={INPUT_CLASS}
                    placeholder="Min"
                    value={row.min ?? ""}
                    onChange={(e) => updateRow(row.id, { min: e.target.value })}
                  />
                  <input
                    className={INPUT_CLASS}
                    placeholder="Max"
                    value={row.max ?? ""}
                    onChange={(e) => updateRow(row.id, { max: e.target.value })}
                  />
                </div>
              )}
              {row.type === "file" && (
                <input
                  className={INPUT_CLASS}
                  placeholder="accept (e.g. image/*)"
                  value={row.accept ?? ""}
                  onChange={(e) =>
                    updateRow(row.id, { accept: e.target.value })
                  }
                />
              )}
            </div>
          ))}
          <button type="button" className={BUTTON_SECONDARY} onClick={addRow}>
            + Add field
          </button>
        </div>
      )}

      {mode === "raw" && (
        <div>
          <textarea
            className={TEXTAREA_CLASS}
            rows={14}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onBlur={handleRawBlur}
            aria-label="Raw JSON schema"
          />
          {rawError && (
            <p className="mt-1 text-xs text-red-400" data-testid={`${testIdPrefix}-raw-error`}>
              {rawError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 4 — Pricing
// ──────────────────────────────────────────────────────────────────────────

function WizardPricingStep({ draft, setDraft }: StepProps): JSX.Element {
  const canAutoRelease =
    draft.escrow_strategy === "all_or_nothing" && draft.execution_mode !== "manual";

  return (
    <div className={SECTION_CLASS} data-testid="pricing-step">
      <h2 className="text-lg font-semibold">Pricing &amp; Escrow</h2>

      <div>
        <span className={LABEL_CLASS}>Pricing type</span>
        <div className="flex gap-2 flex-wrap">
          {(["fixed", "hourly", "custom"] as PricingType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={TAB_CLASS(draft.pricing_type === t)}
              onClick={() => setDraft({ ...draft, pricing_type: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS} htmlFor="wiz-price">
            Price amount
          </label>
          <input
            id="wiz-price"
            className={INPUT_CLASS}
            placeholder="0.01"
            value={draft.price_amount}
            onChange={(e) =>
              setDraft({ ...draft, price_amount: e.target.value })
            }
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="wiz-token">
            Token
          </label>
          <input
            id="wiz-token"
            className={INPUT_CLASS}
            placeholder="ETH"
            value={draft.price_token}
            onChange={(e) => setDraft({ ...draft, price_token: e.target.value })}
          />
        </div>
      </div>

      <div>
        <span className={LABEL_CLASS}>Escrow strategy</span>
        <div className="flex gap-2 flex-wrap">
          {(["all_or_nothing", "milestone", "trickle"] as EscrowStrategy[]).map((s) => (
            <button
              key={s}
              type="button"
              className={TAB_CLASS(draft.escrow_strategy === s)}
              onClick={() =>
                setDraft({
                  ...draft,
                  escrow_strategy: s,
                  auto_release_on_delivery:
                    s === "all_or_nothing" && draft.execution_mode !== "manual"
                      ? draft.auto_release_on_delivery
                      : false,
                })
              }
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-weavrn-muted">
          Only <code>all_or_nothing</code> pairs with auto-release today.
        </p>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="wiz-deadline">
          Default deadline (seconds)
        </label>
        <input
          id="wiz-deadline"
          type="number"
          min={60}
          className={INPUT_CLASS}
          value={draft.default_deadline_seconds}
          onChange={(e) =>
            setDraft({
              ...draft,
              default_deadline_seconds: Number(e.target.value) || 0,
            })
          }
        />
        <p className="text-[11px] text-weavrn-muted mt-1">
          Defaults: 300 for hosted, 1800 for BYO, 3600 for manual.
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs text-weavrn-muted">
        <input
          type="checkbox"
          disabled={!canAutoRelease}
          checked={draft.auto_release_on_delivery}
          onChange={(e) =>
            setDraft({ ...draft, auto_release_on_delivery: e.target.checked })
          }
        />
        Auto-release escrow on delivery (all_or_nothing + non-manual only)
      </label>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 5 — Execution mode
// ──────────────────────────────────────────────────────────────────────────

interface ExecutionStepProps extends StepProps {
  config: { byoEnabled: boolean; hostedEnabled: boolean } | null;
}

function WizardExecutionStep({
  draft,
  setDraft,
  config,
}: ExecutionStepProps): JSX.Element {
  const hostedDisabled = !config?.hostedEnabled;
  const byoDisabled = !config?.byoEnabled;

  const [byoTestStatus, setByoTestStatus] = useState<string | null>(null);
  const [byoTesting, setByoTesting] = useState(false);

  const setMode = (mode: ExecutionMode) => {
    const deadline = defaultDeadlineFor(mode);
    const runner_config =
      mode === "hosted" ? buildHostedRunnerConfig(draft) : null;
    setDraft({
      ...draft,
      execution_mode: mode,
      default_deadline_seconds: deadline,
      runner_config,
      auto_release_on_delivery:
        draft.auto_release_on_delivery &&
        mode !== "manual" &&
        draft.escrow_strategy === "all_or_nothing",
    });
  };

  const onGenSecret = () => {
    const secret = generateHmacSecret();
    setDraft({ ...draft, endpoint_secret: secret });
  };

  const onCopySecret = async () => {
    if (!draft.endpoint_secret) return;
    try {
      await globalThis.navigator?.clipboard?.writeText(draft.endpoint_secret);
    } catch {
      // noop
    }
  };

  const onTestConnection = async () => {
    if (!draft.endpoint_url || !draft.endpoint_secret) return;
    setByoTesting(true);
    setByoTestStatus(null);
    try {
      const res = await fetch(`${API_URL}/tools/test-byo-endpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint_url: draft.endpoint_url,
          hmac_secret: draft.endpoint_secret,
        }),
      });
      if (res.status === 404) {
        setByoTestStatus("Test helper not yet available");
        return;
      }
      if (!res.ok) {
        setByoTestStatus(`Test failed: ${res.status}`);
        return;
      }
      const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (body?.ok) {
        setByoTestStatus("Endpoint reachable");
      } else {
        setByoTestStatus("Endpoint responded but rejected the test");
      }
    } catch {
      setByoTestStatus("Test helper not yet available");
    } finally {
      setByoTesting(false);
    }
  };

  return (
    <div className={SECTION_CLASS} data-testid="execution-step">
      <h2 className="text-lg font-semibold">Execution mode</h2>

      <div className="flex gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={draft.execution_mode === "manual"}
          className={TAB_CLASS(draft.execution_mode === "manual")}
          onClick={() => setMode("manual")}
        >
          Manual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={draft.execution_mode === "hosted"}
          disabled={hostedDisabled}
          className={TAB_CLASS(draft.execution_mode === "hosted", hostedDisabled)}
          onClick={() => !hostedDisabled && setMode("hosted")}
          data-testid="hosted-tab"
        >
          Hosted
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={draft.execution_mode === "byo"}
          disabled={byoDisabled}
          className={TAB_CLASS(draft.execution_mode === "byo", byoDisabled)}
          onClick={() => !byoDisabled && setMode("byo")}
          data-testid="byo-tab"
        >
          BYO
        </button>
      </div>

      {draft.execution_mode === "manual" && (
        <p className="text-sm text-weavrn-muted">
          The provider will manually accept and deliver each job.
        </p>
      )}

      {draft.execution_mode === "hosted" && (
        <>
          {hostedDisabled ? (
            <div className="border border-weavrn-border rounded-lg p-4 text-sm text-weavrn-muted">
              Hosted execution is coming in Phase 4.
            </div>
          ) : (
            <HostedRunnerEditor draft={draft} setDraft={setDraft} />
          )}
        </>
      )}

      {draft.execution_mode === "byo" && (
        <>
          {byoDisabled ? (
            <div className="border border-weavrn-border rounded-lg p-4 text-sm text-weavrn-muted">
              BYO execution is coming in Phase 3.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={LABEL_CLASS} htmlFor="wiz-endpoint">
                  Endpoint URL (https)
                </label>
                <input
                  id="wiz-endpoint"
                  className={INPUT_CLASS}
                  placeholder="https://tool.example.com/invoke"
                  value={draft.endpoint_url ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, endpoint_url: e.target.value || null })
                  }
                />
                {draft.endpoint_url &&
                  !draft.endpoint_url.startsWith("https://") && (
                    <p className="mt-1 text-xs text-red-400">
                      Endpoint must start with https://
                    </p>
                  )}
              </div>

              <div>
                <label className={LABEL_CLASS}>HMAC secret</label>
                <div className="flex gap-2">
                  <input
                    className={INPUT_CLASS}
                    readOnly
                    value={draft.endpoint_secret ?? ""}
                    placeholder="Press 'Generate' to create a secret"
                  />
                  <button
                    type="button"
                    className={BUTTON_SECONDARY}
                    onClick={onGenSecret}
                  >
                    Generate HMAC secret
                  </button>
                  {draft.endpoint_secret && (
                    <button
                      type="button"
                      className={BUTTON_SECONDARY}
                      onClick={onCopySecret}
                    >
                      Copy
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-yellow-400">
                  The secret is shown once. Store it somewhere safe before
                  publishing.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  className={BUTTON_SECONDARY}
                  disabled={
                    byoTesting ||
                    !draft.endpoint_url ||
                    !draft.endpoint_secret ||
                    !draft.endpoint_url.startsWith("https://")
                  }
                  onClick={onTestConnection}
                >
                  {byoTesting ? "Testing..." : "Test connection"}
                </button>
                {byoTestStatus && (
                  <p className="mt-1 text-xs text-weavrn-muted">
                    {byoTestStatus}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="border-t border-weavrn-border/60 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS} htmlFor="wiz-timeout">
            Timeout (seconds)
          </label>
          <input
            id="wiz-timeout"
            type="number"
            min={1}
            max={900}
            className={INPUT_CLASS}
            value={draft.timeout_seconds}
            onChange={(e) => {
              const raw = Number(e.target.value);
              const clamped = Number.isFinite(raw)
                ? Math.max(1, Math.min(900, raw))
                : 60;
              setDraft({ ...draft, timeout_seconds: clamped });
            }}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="wiz-max-in">
            Max input bytes
          </label>
          <input
            id="wiz-max-in"
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={draft.max_input_bytes}
            onChange={(e) =>
              setDraft({ ...draft, max_input_bytes: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="wiz-max-out">
            Max output bytes
          </label>
          <input
            id="wiz-max-out"
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={draft.max_output_bytes}
            onChange={(e) =>
              setDraft({ ...draft, max_output_bytes: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="wiz-rpm">
            Max calls/min (optional)
          </label>
          <input
            id="wiz-rpm"
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={draft.max_calls_per_minute ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setDraft({
                ...draft,
                max_calls_per_minute: v === "" ? null : Number(v),
              });
            }}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="wiz-rpd">
            Max calls/day (optional)
          </label>
          <input
            id="wiz-rpd"
            type="number"
            min={0}
            className={INPUT_CLASS}
            value={draft.max_calls_per_day ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setDraft({
                ...draft,
                max_calls_per_day: v === "" ? null : Number(v),
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function buildHostedRunnerConfig(draft: ToolDraft): Record<string, unknown> {
  const existing = draft.runner_config;
  if (draft.hosted_kind === "llm") {
    return {
      kind: "llm",
      system_prompt:
        (isPlainObject(existing) && typeof existing.system_prompt === "string"
          ? existing.system_prompt
          : "") || "",
      model_name:
        (isPlainObject(existing) && typeof existing.model_name === "string"
          ? existing.model_name
          : "") || "claude-haiku-4-5",
      temperature:
        isPlainObject(existing) && typeof existing.temperature === "number"
          ? existing.temperature
          : 0.7,
    };
  }
  if (draft.hosted_kind === "script") {
    return {
      kind: "script",
      language:
        (isPlainObject(existing) && typeof existing.language === "string"
          ? (existing.language as string)
          : "node") || "node",
      source:
        (isPlainObject(existing) && typeof existing.source === "string"
          ? existing.source
          : "") || "",
    };
  }
  return {
    kind: "container",
    image:
      (isPlainObject(existing) && typeof existing.image === "string"
        ? existing.image
        : "") || "",
    command:
      isPlainObject(existing) && Array.isArray(existing.command)
        ? existing.command
        : [],
  };
}

function HostedRunnerEditor({ draft, setDraft }: StepProps): JSX.Element {
  const setKind = (kind: HostedKind) => {
    setDraft({
      ...draft,
      hosted_kind: kind,
      runner_config: buildHostedRunnerConfig({ ...draft, hosted_kind: kind }),
    });
  };
  const patchConfig = (patch: Record<string, unknown>) => {
    const base = isPlainObject(draft.runner_config) ? draft.runner_config : {};
    setDraft({ ...draft, runner_config: { ...base, ...patch } });
  };

  const cfg = isPlainObject(draft.runner_config) ? draft.runner_config : {};

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["llm", "script", "container"] as HostedKind[]).map((k) => (
          <button
            key={k}
            type="button"
            className={TAB_CLASS(draft.hosted_kind === k)}
            onClick={() => setKind(k)}
          >
            {k === "llm" ? "LLM-backed" : k[0].toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      {draft.hosted_kind === "llm" && (
        <div className="space-y-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="wiz-hosted-prompt">
              System prompt
            </label>
            <textarea
              id="wiz-hosted-prompt"
              className={INPUT_CLASS}
              rows={4}
              value={typeof cfg.system_prompt === "string" ? cfg.system_prompt : ""}
              onChange={(e) => patchConfig({ system_prompt: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} htmlFor="wiz-hosted-model">
                Model name
              </label>
              <input
                id="wiz-hosted-model"
                className={INPUT_CLASS}
                value={typeof cfg.model_name === "string" ? cfg.model_name : ""}
                onChange={(e) => patchConfig({ model_name: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="wiz-hosted-temp">
                Temperature
              </label>
              <input
                id="wiz-hosted-temp"
                type="number"
                step={0.1}
                min={0}
                max={2}
                className={INPUT_CLASS}
                value={typeof cfg.temperature === "number" ? cfg.temperature : 0.7}
                onChange={(e) =>
                  patchConfig({ temperature: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="wiz-runner-ref">
              Runner ref (hosted agent id, optional)
            </label>
            <input
              id="wiz-runner-ref"
              className={INPUT_CLASS}
              value={draft.runner_ref ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, runner_ref: e.target.value || null })
              }
            />
          </div>
        </div>
      )}

      {draft.hosted_kind === "script" && (
        <div className="space-y-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="wiz-hosted-lang">
              Language
            </label>
            <select
              id="wiz-hosted-lang"
              className={INPUT_CLASS}
              value={typeof cfg.language === "string" ? cfg.language : "node"}
              onChange={(e) => patchConfig({ language: e.target.value })}
            >
              <option value="node">node</option>
              <option value="python">python</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="wiz-hosted-source">
              Source
            </label>
            <textarea
              id="wiz-hosted-source"
              className={TEXTAREA_CLASS}
              rows={10}
              maxLength={65536}
              value={typeof cfg.source === "string" ? cfg.source : ""}
              onChange={(e) => patchConfig({ source: e.target.value })}
            />
            <p className="text-[11px] text-weavrn-muted mt-1">
              Up to 65536 characters.
            </p>
          </div>
        </div>
      )}

      {draft.hosted_kind === "container" && (
        <div className="space-y-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="wiz-hosted-image">
              Image
            </label>
            <input
              id="wiz-hosted-image"
              className={INPUT_CLASS}
              placeholder="ghcr.io/acme/tool:1.0"
              value={typeof cfg.image === "string" ? cfg.image : ""}
              onChange={(e) => patchConfig({ image: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="wiz-hosted-cmd">
              Command (comma-separated, optional)
            </label>
            <input
              id="wiz-hosted-cmd"
              className={INPUT_CLASS}
              placeholder="/bin/run, --flag"
              value={
                Array.isArray(cfg.command) ? (cfg.command as unknown[]).join(", ") : ""
              }
              onChange={(e) =>
                patchConfig({
                  command: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Step 6 — Review & Publish
// ──────────────────────────────────────────────────────────────────────────

interface ReviewStepProps extends StepProps {
  onPublish: () => void | Promise<void>;
  publishing: boolean;
  publishError: string | null;
  isEdit: boolean;
}

function WizardReviewStep({
  draft,
  onPublish,
  publishing,
  publishError,
  isEdit,
}: ReviewStepProps): JSX.Element {
  const inputFields: FormField[] = useMemo(() => {
    if (!draft.input_schema) return [];
    try {
      return schemaToFormFields(draft.input_schema);
    } catch {
      return [];
    }
  }, [draft.input_schema]);

  const sample = useMemo(
    () =>
      sampleDeliverableFor(
        draft.mcp_tool_slug,
        draft.output_content_type,
        draft.output_schema,
      ),
    [draft.mcp_tool_slug, draft.output_content_type, draft.output_schema],
  );

  const summary: [string, string][] = [
    ["title", draft.title],
    ["slug", draft.mcp_tool_slug],
    ["category", draft.tool_category],
    ["content_type", draft.output_content_type],
    ["pricing", `${draft.pricing_type} — ${draft.price_amount} ${draft.price_token}`],
    ["escrow", draft.escrow_strategy],
    ["execution", draft.execution_mode],
    ["deadline", `${draft.default_deadline_seconds}s`],
    ["timeout", `${draft.timeout_seconds}s`],
    ["auto_release", draft.auto_release_on_delivery ? "yes" : "no"],
  ];

  return (
    <div className={SECTION_CLASS} data-testid="review-step">
      <h2 className="text-lg font-semibold">Review &amp; publish</h2>

      <div className="border border-weavrn-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Consumer preview</h3>
        <div className="mb-4">
          <p className="text-xs text-weavrn-muted mb-2">Input form</p>
          {inputFields.length > 0 ? (
            <SchemaForm fields={inputFields} value={{}} onChange={() => {}} disabled />
          ) : (
            <p className="text-xs text-weavrn-muted">No input fields</p>
          )}
        </div>
        <div>
          <p className="text-xs text-weavrn-muted mb-2">Output renderer</p>
          <ToolOutputView
            deliverableData={sample}
            outputSchema={draft.output_schema ?? undefined}
            contentType={draft.output_content_type}
          />
        </div>
      </div>

      <div className="border border-weavrn-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Summary</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4 text-xs">
          {summary.map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-weavrn-muted">{k}</dt>
              <dd className="text-gray-200 font-mono">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      {publishError && (
        <p className="text-sm text-red-400" data-testid="publish-error">
          {publishError}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className={BUTTON_PRIMARY}
          onClick={() => void onPublish()}
          disabled={publishing}
          data-testid="publish-button"
        >
          {publishing ? "Publishing..." : isEdit ? "Save changes" : "Publish tool"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Top-level wizard
// ──────────────────────────────────────────────────────────────────────────

export default function ToolPublishWizard({
  walletAddress,
  signer,
  editListingId,
  searchParams,
  publishAsWallet,
}: Props): JSX.Element {
  const effectivePublishWallet = (publishAsWallet ?? walletAddress)?.toLowerCase() ?? null;
  const isHostedAgentPublish =
    !!effectivePublishWallet &&
    !!walletAddress &&
    effectivePublishWallet !== walletAddress.toLowerCase();
  const lsKey = walletAddress ? `${LS_PREFIX}${walletAddress.toLowerCase()}` : null;

  const [draft, setDraft] = useState<ToolDraft>(() => makeInitialDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [slugState, setSlugState] = useState<SlugState>({ status: "idle" });
  const [config, setConfig] = useState<{
    byoEnabled: boolean;
    hostedEnabled: boolean;
  } | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Edit mode — read listing id from query on mount.
  const editIdRef = useRef<number | null>(
    editListingId ??
      (searchParams && searchParams.get("edit")
        ? Number(searchParams.get("edit"))
        : null),
  );
  const isEdit = editIdRef.current !== null && !Number.isNaN(editIdRef.current);

  // Load tool config on mount.
  useEffect(() => {
    let cancelled = false;
    getToolConfig()
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        if (!cancelled) setConfig({ byoEnabled: false, hostedEnabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Check for saved draft on mount.
  useEffect(() => {
    if (!lsKey) return;
    if (isEdit) return;
    try {
      const raw = globalThis.localStorage?.getItem(lsKey);
      if (raw) setShowResumePrompt(true);
    } catch {
      // ignore
    }
    // run once per wallet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lsKey]);

  // Load listing on edit.
  useEffect(() => {
    if (!isEdit || !editIdRef.current) return;
    let cancelled = false;
    getListing(editIdRef.current)
      .then((listing) => {
        if (cancelled) return;
        setDraft(draftFromListing(listing));
      })
      .catch(() => {
        // noop — stay on empty draft
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  // Autosave draft (debounced).
  useEffect(() => {
    if (!lsKey) return;
    const handle = setTimeout(() => {
      try {
        globalThis.localStorage?.setItem(lsKey, JSON.stringify(draft));
      } catch {
        // ignore quota errors
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [draft, lsKey]);

  const resumeDraft = () => {
    if (!lsKey) return;
    try {
      const raw = globalThis.localStorage?.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ToolDraft>;
        setDraft({ ...makeInitialDraft(), ...parsed });
      }
    } catch {
      // ignore
    }
    setShowResumePrompt(false);
  };

  const startFresh = () => {
    if (lsKey) {
      try {
        globalThis.localStorage?.removeItem(lsKey);
      } catch {
        // ignore
      }
    }
    setShowResumePrompt(false);
  };

  // Step validation — used to gate "Next" and stepper clicks.
  const stepsReached = useMemo(() => {
    // Mark how far the user has progressed. A step is reachable if all
    // prior steps are valid.
    const basicsOk =
      draft.title.trim().length > 0 &&
      SLUG_REGEX.test(draft.mcp_tool_slug) &&
      slugState.status !== "taken" &&
      slugState.status !== "checking" &&
      draft.description.trim().length > 0 &&
      draft.description_for_model.trim().length > 0;
    const inputOk = draft.input_schema !== null;
    const outputOk =
      draft.output_schema !== null && draft.output_content_type.length > 0;
    const pricingOk = draft.price_amount.length > 0 && draft.price_token.length > 0;
    const executionOk = (() => {
      if (draft.execution_mode === "manual") return true;
      if (draft.execution_mode === "byo") {
        return !!draft.endpoint_url?.startsWith("https://") && !!draft.endpoint_secret;
      }
      if (draft.execution_mode === "hosted") {
        return isPlainObject(draft.runner_config);
      }
      return false;
    })();
    return {
      0: true,
      1: basicsOk,
      2: basicsOk && inputOk,
      3: basicsOk && inputOk && outputOk,
      4: basicsOk && inputOk && outputOk && pricingOk,
      5: basicsOk && inputOk && outputOk && pricingOk && executionOk,
    } as Record<number, boolean>;
  }, [draft, slugState.status]);

  const canGoNext = stepsReached[stepIndex + 1] === true;

  // Publish handler.
  const handlePublish = useCallback(async () => {
    if (!signer || !walletAddress) {
      setPublishError("Connect a wallet to publish");
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      const payload = buildPublishPayload(draft);
      const payloadWithAgent = isHostedAgentPublish
        ? { ...payload, agent_wallet: effectivePublishWallet }
        : payload;
      if (isEdit && editIdRef.current) {
        await updateListing(
          signer,
          walletAddress,
          editIdRef.current,
          payloadWithAgent as unknown as Partial<ServiceListing>,
        );
      } else {
        // createListing's declared shape omits many MCP keys. The server
        // accepts them on the same POST body via the spread in api.ts, so
        // cast the extended payload to the narrower signature.
        await createListing(
          signer,
          walletAddress,
          payloadWithAgent as unknown as Parameters<typeof createListing>[2],
        );
      }
      // Clear autosave and redirect.
      if (lsKey) {
        try {
          globalThis.localStorage?.removeItem(lsKey);
        } catch {
          // ignore
        }
      }
      const destinationWallet = effectivePublishWallet || walletAddress;
      const destination = `/tools/view?provider=${encodeURIComponent(
        destinationWallet,
      )}&slug=${encodeURIComponent(draft.mcp_tool_slug)}`;
      if (typeof window !== "undefined") {
        window.location.href = destination;
      }
    } catch (err) {
      setPublishError(
        (err as { message?: string }).message || "Failed to publish tool",
      );
    } finally {
      setPublishing(false);
    }
  }, [signer, walletAddress, draft, isEdit, lsKey, isHostedAgentPublish, effectivePublishWallet]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Stepper */}
      <div
        className="flex items-center gap-1 overflow-x-auto glow-card rounded-xl p-3"
        role="tablist"
        aria-label="Publish wizard steps"
      >
        {STEPS.map((label, i) => {
          const reachable = stepsReached[i];
          const active = i === stepIndex;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              className={`px-2 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors ${
                active
                  ? "bg-weavrn-accent text-black font-semibold"
                  : reachable
                    ? "text-gray-300 hover:text-white"
                    : "text-weavrn-muted cursor-not-allowed"
              }`}
              disabled={!reachable}
              onClick={() => reachable && setStepIndex(i)}
              data-testid={`step-${i}`}
            >
              {i + 1}/6 {label}
            </button>
          );
        })}
      </div>

      {/* Resume draft prompt */}
      {showResumePrompt && !isEdit && (
        <div className="border border-weavrn-accent/40 rounded-lg p-3 flex items-center justify-between gap-2 bg-weavrn-accent/5">
          <p className="text-xs text-weavrn-accent">
            A saved draft exists for this wallet.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={BUTTON_SECONDARY}
              onClick={resumeDraft}
              data-testid="resume-draft"
            >
              Resume draft
            </button>
            <button
              type="button"
              className={BUTTON_SECONDARY}
              onClick={startFresh}
              data-testid="start-fresh"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}

      {/* Wallet warning */}
      {!walletAddress && (
        <div className="border border-yellow-500/40 rounded-lg p-3 text-xs text-yellow-400 bg-yellow-500/5">
          Connect a wallet to check slug availability and publish your tool.
        </div>
      )}

      {stepIndex === 0 && (
        <WizardBasicsStep
          draft={draft}
          setDraft={setDraft}
          walletAddress={effectivePublishWallet}
          slugState={slugState}
          setSlugState={setSlugState}
        />
      )}

      {stepIndex === 1 && (
        <SchemaEditor
          title="Input schema"
          category={draft.tool_category}
          mode={draft.input_schema_mode}
          setMode={(m) => setDraft((d) => ({ ...d, input_schema_mode: m }))}
          schema={draft.input_schema}
          setSchema={(s) => setDraft((d) => ({ ...d, input_schema: s }))}
          builderRows={draft.input_builder_rows}
          setBuilderRows={(rows) =>
            setDraft((d) => ({ ...d, input_builder_rows: rows }))
          }
          rawText={draft.input_raw_text}
          setRawText={(s) => setDraft((d) => ({ ...d, input_raw_text: s }))}
          presetFn={getPresetForCategory}
          testIdPrefix="input"
        />
      )}

      {stepIndex === 1 && draft.input_schema && (
        <div className={SECTION_CLASS}>
          <h3 className="text-sm font-semibold">Live preview</h3>
          <LivePreviewForm schema={draft.input_schema} />
        </div>
      )}

      {stepIndex === 2 && (
        <>
          <SchemaEditor
            title="Output schema"
            category={draft.tool_category}
            mode={draft.output_schema_mode}
            setMode={(m) => setDraft((d) => ({ ...d, output_schema_mode: m }))}
            schema={draft.output_schema}
            setSchema={(s) => setDraft((d) => ({ ...d, output_schema: s }))}
            builderRows={draft.output_builder_rows}
            setBuilderRows={(rows) =>
              setDraft((d) => ({ ...d, output_builder_rows: rows }))
            }
            rawText={draft.output_raw_text}
            setRawText={(s) => setDraft((d) => ({ ...d, output_raw_text: s }))}
            presetFn={getOutputPresetForCategory}
            testIdPrefix="output"
          />
          <div className={SECTION_CLASS}>
            <label className={LABEL_CLASS} htmlFor="wiz-ct">
              Output content type
            </label>
            <select
              id="wiz-ct"
              className={INPUT_CLASS}
              value={draft.output_content_type}
              onChange={(e) =>
                setDraft({ ...draft, output_content_type: e.target.value })
              }
            >
              {CONTENT_TYPE_OPTIONS.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <p className="text-xs text-weavrn-muted mb-2">Preview</p>
              <ToolOutputView
                deliverableData={sampleDeliverableFor(
                  draft.mcp_tool_slug,
                  draft.output_content_type,
                  draft.output_schema,
                )}
                outputSchema={draft.output_schema ?? undefined}
                contentType={draft.output_content_type}
              />
            </div>
          </div>
        </>
      )}

      {stepIndex === 3 && <WizardPricingStep draft={draft} setDraft={setDraft} />}

      {stepIndex === 4 && (
        <WizardExecutionStep draft={draft} setDraft={setDraft} config={config} />
      )}

      {stepIndex === 5 && (
        <WizardReviewStep
          draft={draft}
          setDraft={setDraft}
          onPublish={handlePublish}
          publishing={publishing}
          publishError={publishError}
          isEdit={isEdit}
        />
      )}

      {/* Step nav */}
      <div className="flex justify-between">
        <button
          type="button"
          className={BUTTON_SECONDARY}
          disabled={stepIndex === 0}
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
        >
          Back
        </button>
        {stepIndex < STEPS.length - 1 && (
          <button
            type="button"
            className={BUTTON_PRIMARY}
            disabled={!canGoNext}
            onClick={() => setStepIndex(stepIndex + 1)}
            data-testid="next-button"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function LivePreviewForm({ schema }: { schema: JSONSchema }): JSX.Element {
  const [value, setValue] = useState<Record<string, unknown>>({});
  const fields = useMemo(() => {
    try {
      return schemaToFormFields(schema);
    } catch {
      return [] as FormField[];
    }
  }, [schema]);
  return <SchemaForm fields={fields} value={value} onChange={setValue} />;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers: publish payload + listing → draft
// ──────────────────────────────────────────────────────────────────────────

function buildPublishPayload(draft: ToolDraft) {
  return {
    title: draft.title,
    description: draft.description,
    category: draft.tool_category,
    tags: draft.tags,
    pricing_type: draft.pricing_type,
    price_amount: draft.price_amount,
    price_token: draft.price_token,
    escrow_strategy: draft.escrow_strategy,
    default_deadline_seconds: draft.default_deadline_seconds,
    // MCP columns
    mcp_tool_slug: draft.mcp_tool_slug,
    description_for_model: draft.description_for_model,
    tool_category: draft.tool_category,
    input_schema: draft.input_schema,
    output_schema: draft.output_schema,
    output_content_type: draft.output_content_type,
    execution_mode: draft.execution_mode,
    endpoint_url: draft.endpoint_url,
    endpoint_secret: draft.endpoint_secret,
    runner_ref: draft.runner_ref,
    runner_config: draft.runner_config,
    timeout_seconds: draft.timeout_seconds,
    max_input_bytes: draft.max_input_bytes,
    max_output_bytes: draft.max_output_bytes,
    max_calls_per_minute: draft.max_calls_per_minute,
    max_calls_per_day: draft.max_calls_per_day,
    auto_release_on_delivery: draft.auto_release_on_delivery,
  };
}

function draftFromListing(listing: ServiceListing): ToolDraft {
  const base = makeInitialDraft();
  const asExt = listing as ServiceListing & {
    description_for_model?: string | null;
    output_schema?: unknown;
    output_content_type?: string | null;
    execution_mode?: "manual" | "hosted" | "byo" | null;
    endpoint_url?: string | null;
    runner_ref?: string | null;
    runner_config?: Record<string, unknown> | null;
    timeout_seconds?: number | null;
    max_input_bytes?: number | null;
    max_output_bytes?: number | null;
    default_deadline_seconds?: number | null;
    max_calls_per_minute?: number | null;
    max_calls_per_day?: number | null;
    auto_release_on_delivery?: boolean | null;
    tool_category?: string | null;
  };

  const execution_mode: ExecutionMode =
    asExt.execution_mode === "hosted" || asExt.execution_mode === "byo"
      ? asExt.execution_mode
      : "manual";

  const category: ToolCategory =
    (TOOL_CATEGORIES as readonly string[]).includes(asExt.tool_category ?? "")
      ? (asExt.tool_category as ToolCategory)
      : "other";

  let inputSchema: JSONSchema | null = null;
  if (Array.isArray(listing.input_schema)) {
    // Legacy — leave null; the user can re-author in Builder tab.
    inputSchema = null;
  } else if (listing.input_schema && isPlainObject(listing.input_schema as unknown as object)) {
    inputSchema = listing.input_schema as unknown as JSONSchema;
  }

  let outputSchema: JSONSchema | null = null;
  if (isPlainObject(asExt.output_schema)) {
    outputSchema = asExt.output_schema as JSONSchema;
  }

  return {
    ...base,
    title: listing.title,
    mcp_tool_slug: listing.mcp_tool_slug ?? "",
    description: listing.description,
    description_for_model: asExt.description_for_model ?? "",
    tool_category: category,
    tags: listing.tags ?? [],
    input_schema: inputSchema,
    input_schema_mode: "raw",
    input_raw_text: inputSchema ? JSON.stringify(inputSchema, null, 2) : "",
    output_schema: outputSchema,
    output_schema_mode: "raw",
    output_raw_text: outputSchema ? JSON.stringify(outputSchema, null, 2) : "",
    output_content_type:
      asExt.output_content_type ?? getDefaultContentTypeForCategory(category),
    pricing_type: listing.pricing_type,
    price_amount: listing.price_amount ?? "0",
    price_token: listing.price_token,
    escrow_strategy: listing.escrow_strategy,
    default_deadline_seconds:
      asExt.default_deadline_seconds ?? defaultDeadlineFor(execution_mode),
    execution_mode,
    runner_config:
      isPlainObject(asExt.runner_config) ? asExt.runner_config : null,
    runner_ref: asExt.runner_ref ?? null,
    endpoint_url: asExt.endpoint_url ?? null,
    endpoint_secret: null,
    timeout_seconds: asExt.timeout_seconds ?? 60,
    max_input_bytes: asExt.max_input_bytes ?? 1048576,
    max_output_bytes: asExt.max_output_bytes ?? 26214400,
    max_calls_per_minute: asExt.max_calls_per_minute ?? null,
    max_calls_per_day: asExt.max_calls_per_day ?? null,
    auto_release_on_delivery: asExt.auto_release_on_delivery ?? false,
  };
}

// Exported for tests so they can assert the payload shape without mounting
// the full wizard.
export const __test = {
  makeInitialDraft,
  buildPublishPayload,
  rowsToSchema,
  sampleDeliverableFor,
  defaultDeadlineFor,
  draftFromListing,
};

// Silence unused-import warnings when tree-shaking — we re-reference InputField
// through the declared payload type to keep the api.ts import honest.
type _InputFieldRef = InputField;
