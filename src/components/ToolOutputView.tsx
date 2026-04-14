"use client";

import { useState } from "react";
import type { JSONSchema } from "../lib/schema-form";

interface ToolOutputViewProps {
  deliverableData: unknown;
  outputSchema?: JSONSchema;
  contentType?: string;
}

interface Envelope {
  tool_slug?: unknown;
  output?: unknown;
  output_url?: unknown;
  content_type?: unknown;
  format?: unknown;
}

const URL_FIELD_ORDER = {
  image: ["image_url", "output_url"],
  audio: ["audio_url", "output_url"],
  video: ["video_url", "output_url"],
  octet: ["output_url", "image_url", "audio_url", "video_url"],
} as const;

const WRAPPER_CLASS =
  "rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4";

const BUTTON_CLASS =
  "inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-weavrn-accent text-black hover:bg-weavrn-accent-hover transition-colors disabled:opacity-50";

const DOWNLOAD_LINK_CLASS =
  "inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-weavrn-accent text-black hover:bg-weavrn-accent-hover transition-colors no-underline";

const PRE_CLASS =
  "text-xs font-mono whitespace-pre-wrap break-words bg-zinc-50 dark:bg-zinc-900 rounded-md p-3 overflow-auto max-h-96 text-zinc-900 dark:text-zinc-100";

const ERROR_CLASS =
  "text-xs text-red-500 dark:text-red-400";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnvelope(raw: unknown): Envelope | null {
  if (!isPlainObject(raw)) return null;
  return raw as Envelope;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extensionFor(contentType: string): string {
  const ct = contentType.toLowerCase();
  switch (ct) {
    case "image/png":
      return ".png";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/ogg":
      return ".ogg";
    case "audio/webm":
      return ".weba";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/ogg":
      return ".ogv";
    case "application/octet-stream":
      return ".bin";
    default: {
      if (ct.startsWith("image/")) return `.${ct.slice("image/".length)}`;
      if (ct.startsWith("audio/")) return `.${ct.slice("audio/".length)}`;
      if (ct.startsWith("video/")) return `.${ct.slice("video/".length)}`;
      return "";
    }
  }
}

function classifyContentType(ct: string | undefined):
  | "text"
  | "json"
  | "image"
  | "audio"
  | "video"
  | "octet" {
  if (!ct) return "json";
  const lower = ct.toLowerCase();
  if (lower === "text") return "text";
  if (lower === "json" || lower === "application/json") return "json";
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("audio/")) return "audio";
  if (lower.startsWith("video/")) return "video";
  if (lower === "application/octet-stream") return "octet";
  return "json";
}

function findSchemaUriField(schema: JSONSchema | undefined): string | undefined {
  if (!isPlainObject(schema)) return undefined;
  const properties = (schema as { properties?: unknown }).properties;
  if (!isPlainObject(properties)) return undefined;
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (!isPlainObject(propSchema)) continue;
    if ((propSchema as { format?: unknown }).format === "uri") {
      return propName;
    }
  }
  return undefined;
}

function resolveUrl(
  envelope: Envelope,
  kind: "image" | "audio" | "video" | "octet",
  outputSchema: JSONSchema | undefined,
): string | undefined {
  // 1. top-level output_url
  const topLevel = getString(envelope.output_url);
  if (topLevel) return topLevel;

  const output = isPlainObject(envelope.output) ? envelope.output : undefined;

  // 2. scan output for conventional keys in order
  if (output) {
    const order = URL_FIELD_ORDER[kind];
    for (const key of order) {
      const val = getString(output[key]);
      if (val) return val;
    }
  }

  // 3. outputSchema.properties format: 'uri' fallback
  if (output) {
    const uriField = findSchemaUriField(outputSchema);
    if (uriField !== undefined) {
      const val = getString(output[uriField]);
      if (val) return val;
    }
  }

  return undefined;
}

function stringifyOutput(output: unknown): string {
  if (output === null || output === undefined) return "";
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

function stringifyJsonOutput(output: unknown): string {
  if (output === undefined) return "";
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

function suggestedFilename(slug: string | undefined, contentType: string): string {
  const base = slug && slug.length > 0 ? slug : "tool-output";
  const ext = extensionFor(contentType);
  return `${base}${ext}`;
}

function CopyButton({ text }: { text: string }): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable; silently swallow.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={BUTTON_CLASS}
      aria-label="Copy output to clipboard"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DownloadLink({
  url,
  filename,
}: {
  url: string;
  filename: string;
}): JSX.Element {
  return (
    <a
      href={url}
      download={filename}
      target="_blank"
      rel="noopener noreferrer"
      className={DOWNLOAD_LINK_CLASS}
    >
      Download
    </a>
  );
}

function NoOutputCard(): JSX.Element {
  return (
    <div className={WRAPPER_CLASS}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">No output</p>
    </div>
  );
}

function MissingUrlCard(): JSX.Element {
  return (
    <div className={WRAPPER_CLASS}>
      <p className={ERROR_CLASS}>Output URL missing</p>
    </div>
  );
}

export default function ToolOutputView({
  deliverableData,
  outputSchema,
  contentType,
}: ToolOutputViewProps): JSX.Element {
  const envelope = parseEnvelope(deliverableData);
  if (!envelope) {
    return <NoOutputCard />;
  }

  const slug = getString(envelope.tool_slug);
  const envelopeContentType = getString(envelope.content_type);
  const effectiveContentType = contentType ?? envelopeContentType;
  const kind = classifyContentType(effectiveContentType);
  const effectiveCtForFilename = effectiveContentType ?? "";

  if (kind === "text") {
    const text = stringifyOutput(envelope.output);
    return (
      <div className={WRAPPER_CLASS}>
        <div className="flex items-center justify-end gap-2 mb-2">
          <CopyButton text={text} />
        </div>
        <pre className={PRE_CLASS} data-testid="tool-output-text">
          {text}
        </pre>
      </div>
    );
  }

  if (kind === "json") {
    const json = stringifyJsonOutput(envelope.output);
    return (
      <div className={WRAPPER_CLASS}>
        <div className="flex items-center justify-end gap-2 mb-2">
          <CopyButton text={json} />
        </div>
        <pre className={PRE_CLASS} data-testid="tool-output-json">
          {json}
        </pre>
      </div>
    );
  }

  const url = resolveUrl(envelope, kind, outputSchema);
  if (!url) {
    return <MissingUrlCard />;
  }

  const filename = suggestedFilename(slug, effectiveCtForFilename);
  const altText = slug ?? "Tool output";

  if (kind === "image") {
    return (
      <div className={WRAPPER_CLASS}>
        <img
          src={url}
          alt={altText}
          className="block max-w-full h-auto rounded-md mb-3"
          data-testid="tool-output-image"
        />
        <div className="flex items-center gap-2">
          <DownloadLink url={url} filename={filename} />
        </div>
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className={WRAPPER_CLASS}>
        <audio
          controls
          src={url}
          className="block w-full mb-3"
          data-testid="tool-output-audio"
        />
        <div className="flex items-center gap-2">
          <DownloadLink url={url} filename={filename} />
        </div>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={WRAPPER_CLASS}>
        <video
          controls
          src={url}
          className="block w-full max-w-full rounded-md mb-3"
          data-testid="tool-output-video"
        />
        <div className="flex items-center gap-2">
          <DownloadLink url={url} filename={filename} />
        </div>
      </div>
    );
  }

  // octet-stream — download button only, no inline preview
  return (
    <div className={WRAPPER_CLASS}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        Binary output ready for download.
      </p>
      <DownloadLink url={url} filename={filename} />
    </div>
  );
}
