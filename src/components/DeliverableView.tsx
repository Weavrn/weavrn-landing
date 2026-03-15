"use client";

import type { DeliverableData, DeliverableProof } from "@/lib/api";

interface Props {
  type: string;
  data: DeliverableData | string;
  status: "delivered" | "completed" | "disputed";
}

function ProofPanel({ proof }: { proof: DeliverableProof }) {
  return (
    <div className="space-y-3">
      {/* File manifest */}
      {proof.total_files > 0 && (
        <div>
          <p className="text-xs font-semibold text-white mb-2">
            {proof.total_files} files · {proof.total_lines} lines
          </p>
          <div className="bg-black/30 rounded-lg p-3 max-h-48 overflow-y-auto">
            {proof.files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono py-0.5">
                <span className="text-weavrn-accent">{f.path}</span>
                <span className="text-weavrn-muted">{f.lines} lines{f.language ? ` · ${f.language}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Build status */}
      {proof.build_success !== null && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${proof.build_success ? "text-green-400" : "text-red-400"}`}>
              Build: {proof.build_success ? "Passed" : "Failed"}
            </span>
          </div>
          {proof.build_log && !proof.build_success && (
            <pre className="text-[10px] font-mono bg-black/30 rounded p-2 max-h-24 overflow-y-auto text-red-300 whitespace-pre-wrap">
              {proof.build_log}
            </pre>
          )}
        </div>
      )}

      {/* Run output */}
      {proof.run_output !== null && (
        <div>
          <span className={`text-xs font-semibold ${proof.run_exit_code === 0 ? "text-green-400" : "text-yellow-400"}`}>
            Run output (exit {proof.run_exit_code}):
          </span>
          <pre className="text-[10px] font-mono bg-black/30 rounded p-2 mt-1 max-h-32 overflow-y-auto text-white/80 whitespace-pre-wrap">
            {proof.run_output}
          </pre>
        </div>
      )}

      {/* Test results */}
      {proof.test_success !== null && (
        <div>
          <span className={`text-xs font-semibold ${proof.test_success ? "text-green-400" : "text-red-400"}`}>
            Tests: {proof.test_success ? "Passing" : "Failed"}
          </span>
          {proof.test_output && (
            <pre className="text-[10px] font-mono bg-black/30 rounded p-2 mt-1 max-h-24 overflow-y-auto text-white/80 whitespace-pre-wrap">
              {proof.test_output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeliverableView({ type, data: rawData, status }: Props) {
  if (!rawData) return null;
  const data: DeliverableData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

  const isLocked = status !== "completed";
  const hasProof = data.proof && data.proof.total_files > 0;
  const hasContent = data.content !== null && data.content !== undefined;

  return (
    <div className="rounded-lg bg-weavrn-dark border border-weavrn-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-weavrn-accent/10 text-weavrn-accent uppercase">
          {type}
        </span>
        {data.title && <span className="text-sm font-semibold">{data.title}</span>}
        {data.language && <span className="text-[10px] text-weavrn-muted">{data.language}</span>}
        {isLocked && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 ml-auto">
            Locked until approved
          </span>
        )}
      </div>

      {/* Proof panel — always visible */}
      {hasProof && <ProofPanel proof={data.proof!} />}

      {/* Full content — only when completed */}
      {hasContent && !isLocked ? (
        <div className="border-t border-weavrn-border/50 pt-3">
          {type === "code" ? (
            <pre className="text-xs font-mono bg-black/40 rounded p-3 overflow-x-auto whitespace-pre-wrap text-green-300 max-h-96 overflow-y-auto">
              {data.content}
            </pre>
          ) : (
            <div className="text-xs text-weavrn-muted whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {data.content}
            </div>
          )}

          {/* Download button for completed deliverables */}
          <button
            onClick={() => {
              const blob = new Blob([data.content || ""], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `deliverable.${type === "code" ? "md" : "md"}`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="mt-2 text-xs text-weavrn-accent hover:underline"
          >
            Download deliverable
          </button>
        </div>
      ) : isLocked && !hasProof ? (
        <p className="text-xs text-weavrn-muted italic">
          Deliverable submitted. Approve the job to access the full content.
        </p>
      ) : null}
    </div>
  );
}
