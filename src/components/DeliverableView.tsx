"use client";

import type { DeliverableData, DeliverableProof } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface Props {
  type: string;
  data: DeliverableData | string;
  status: "delivered" | "completed" | "disputed";
  jobId?: number;
  walletAddress?: string;
  signer?: import("ethers").JsonRpcSigner | null;
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

export default function DeliverableView({ type, data: rawData, status, jobId, walletAddress, signer }: Props) {
  if (!rawData) return null;
  let data: DeliverableData;
  try {
    data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  } catch {
    return (
      <div className="rounded-lg bg-weavrn-dark border border-red-500/20 p-4">
        <p className="text-xs text-red-400">Failed to parse deliverable data.</p>
      </div>
    );
  }

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

      {/* Git push result */}
      {(data as DeliverableData & { pr_url?: string }).pr_url && (
        <a
          href={(data as DeliverableData & { pr_url?: string }).pr_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 hover:bg-green-500/15 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" /></svg>
          View on GitHub
        </a>
      )}

      {/* Proof panel — always visible */}
      {hasProof && <ProofPanel proof={data.proof!} />}

      {/* Full content — only when completed */}
      {hasContent && !isLocked ? (
        <div className="border-t border-weavrn-border/50 pt-3">
          {type === "code" ? (
            <>
              {/* For code deliverables, show the report with markdown rendering */}
              <div className="text-xs text-weavrn-muted leading-relaxed max-h-64 overflow-y-auto mb-3 deliverable-markdown">
                <ReactMarkdown
                  skipHtml={true}
                  components={{
                    code({ className, children, ...props }) {
                      const isBlock = className?.includes("language-");
                      if (isBlock) {
                        return <pre className="bg-black/40 rounded p-2 my-1 overflow-x-auto"><code className="text-[10px] font-mono text-green-300" {...props}>{children}</code></pre>;
                      }
                      return <code className="bg-black/30 px-1 rounded text-[10px] font-mono text-weavrn-accent" {...props}>{children}</code>;
                    },
                    p({ children }) { return <p className="mb-1.5">{children}</p>; },
                    ul({ children }) { return <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>; },
                    ol({ children }) { return <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>; },
                    h1({ children }) { return <p className="font-bold text-white mb-1 text-sm">{children}</p>; },
                    h2({ children }) { return <p className="font-bold text-white mb-1">{children}</p>; },
                    h3({ children }) { return <p className="font-semibold text-white mb-1">{children}</p>; },
                    strong({ children }) { return <strong className="text-white font-semibold">{children}</strong>; },
                    a({ href, children }) {
                      const safe = href && /^https?:\/\//.test(href) ? href : undefined;
                      if (!safe) return <span>{children}</span>;
                      return <a href={safe} target="_blank" rel="noopener noreferrer" className="text-weavrn-accent hover:underline">{children}<span className="text-[9px] opacity-60 ml-0.5">↗</span></a>;
                    },
                    hr() { return <hr className="border-weavrn-border/30 my-2" />; },
                  }}
                >
                  {data.content || ""}
                </ReactMarkdown>
              </div>
              {(data as DeliverableData & { has_archive?: boolean }).has_archive && jobId && signer && walletAddress ? (
                <button
                  onClick={async () => {
                    try {
                      const timestamp = Date.now();
                      const message = `weavrn:download-job:${walletAddress.toLowerCase()}:${jobId}:${timestamp}`;
                      const signature = await signer.signMessage(message);
                      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                      const res = await fetch(`${API_URL}/jobs/${jobId}/download`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          wallet_address: walletAddress.toLowerCase(),
                          signature,
                          timestamp,
                        }),
                      });
                      if (!res.ok) throw new Error("Download failed");
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `job-${jobId}-deliverable.tar.gz`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("Download failed:", err);
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-xs bg-weavrn-accent text-black font-semibold hover:bg-weavrn-accent-hover transition-all"
                >
                  Download Project (.tar.gz)
                </button>
              ) : (
                <button
                  onClick={() => {
                    const blob = new Blob([data.content || ""], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `job-${jobId || "deliverable"}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-weavrn-accent hover:underline"
                >
                  Download as markdown
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-xs text-weavrn-muted leading-relaxed max-h-96 overflow-y-auto deliverable-markdown">
                <ReactMarkdown
                  skipHtml={true}
                  components={{
                    code({ className, children, ...props }) {
                      const isBlock = className?.includes("language-");
                      if (isBlock) {
                        return <pre className="bg-black/40 rounded p-2 my-1 overflow-x-auto"><code className="text-[10px] font-mono text-green-300" {...props}>{children}</code></pre>;
                      }
                      return <code className="bg-black/30 px-1 rounded text-[10px] font-mono text-weavrn-accent" {...props}>{children}</code>;
                    },
                    p({ children }) { return <p className="mb-1.5">{children}</p>; },
                    ul({ children }) { return <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>; },
                    ol({ children }) { return <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>; },
                    h1({ children }) { return <p className="font-bold text-white mb-1 text-sm">{children}</p>; },
                    h2({ children }) { return <p className="font-bold text-white mb-1">{children}</p>; },
                    h3({ children }) { return <p className="font-semibold text-white mb-1">{children}</p>; },
                    strong({ children }) { return <strong className="text-white font-semibold">{children}</strong>; },
                    a({ href, children }) {
                      const safe = href && /^https?:\/\//.test(href) ? href : undefined;
                      if (!safe) return <span>{children}</span>;
                      return <a href={safe} target="_blank" rel="noopener noreferrer" className="text-weavrn-accent hover:underline">{children}<span className="text-[9px] opacity-60 ml-0.5">↗</span></a>;
                    },
                    hr() { return <hr className="border-weavrn-border/30 my-2" />; },
                  }}
                >
                  {data.content || ""}
                </ReactMarkdown>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([data.content || ""], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `job-${jobId || "deliverable"}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="mt-2 text-xs text-weavrn-accent hover:underline"
              >
                Download deliverable
              </button>
            </>
          )}
        </div>
      ) : isLocked && !hasProof ? (
        <p className="text-xs text-weavrn-muted italic">
          Deliverable submitted. Approve the job to access the full content.
        </p>
      ) : null}
    </div>
  );
}
