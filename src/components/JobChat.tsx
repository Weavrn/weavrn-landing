"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { JsonRpcSigner } from "ethers";
import { API_URL, sendJobMessage, uploadJobFile, getJobFileUrl } from "@/lib/api";
import type { JobMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface Props {
  jobId: number;
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      skipHtml={true}
      allowedElements={["p", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "strong", "em", "a", "hr", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "br"]}
      components={{
        code({ className, children, ...props }) {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <pre className="bg-black/40 rounded p-2 my-1 overflow-x-auto">
                <code className="text-[10px] font-mono text-green-300" {...props}>{children}</code>
              </pre>
            );
          }
          return <code className="bg-black/30 px-1 rounded text-[10px] font-mono text-weavrn-accent" {...props}>{children}</code>;
        },
        p({ children }) { return <p className="mb-1.5 last:mb-0">{children}</p>; },
        ul({ children }) { return <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>; },
        li({ children }) { return <li>{children}</li>; },
        h1({ children }) { return <p className="font-bold text-white mb-1">{children}</p>; },
        h2({ children }) { return <p className="font-bold text-white mb-1">{children}</p>; },
        h3({ children }) { return <p className="font-semibold text-white mb-1">{children}</p>; },
        strong({ children }) { return <strong className="text-white font-semibold">{children}</strong>; },
        a({ href, children }) {
          const safe = href && /^https?:\/\//.test(href) ? href : undefined;
          if (!safe) return <span className="text-weavrn-muted">{children}</span>;
          return <a href={safe} target="_blank" rel="noopener noreferrer" className="text-weavrn-accent hover:underline">{children}</a>;
        },
        hr() { return <hr className="border-weavrn-border/30 my-2" />; },
        blockquote({ children }) { return <blockquote className="border-l-2 border-weavrn-accent/30 pl-2 italic opacity-80">{children}</blockquote>; },
        table({ children }) { return <table className="text-[10px] w-full my-1">{children}</table>; },
        th({ children }) { return <th className="text-left font-semibold pb-1 pr-2 border-b border-weavrn-border/30">{children}</th>; },
        td({ children }) { return <td className="py-0.5 pr-2">{children}</td>; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function FileCard({ message, jobId, walletAddress }: { message: JobMessage; jobId: number; walletAddress: string }) {
  const meta = message.metadata || {};
  const fileName = (meta.file_name as string) || message.content;
  const fileSize = meta.file_size as number;
  const storedName = (meta.stored_name as string) || fileName;
  const downloadUrl = getJobFileUrl(jobId, storedName, walletAddress);

  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-weavrn-dark border border-weavrn-border hover:border-weavrn-accent/30 transition-colors"
    >
      <svg className="w-4 h-4 text-weavrn-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <div className="min-w-0">
        <p className="text-xs text-white truncate">{fileName}</p>
        {fileSize && <p className="text-[10px] text-weavrn-muted">{fileSize < 1024 ? `${fileSize}B` : `${Math.round(fileSize / 1024)}KB`}</p>}
      </div>
    </a>
  );
}

export default function JobChat({ jobId, walletAddress, signer }: Props) {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/messages?wallet_address=${walletAddress.toLowerCase()}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages((prev) => {
        if (!Array.isArray(data.messages)) return prev;
        if (data.messages.length !== prev.length) {
          if (data.messages.length > prev.length && waiting) {
            const lastMsg = data.messages[data.messages.length - 1];
            if (lastMsg.role === "agent" || lastMsg.role === "system") {
              setWaiting(false);
            }
          }
          return data.messages;
        }
        return prev;
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [jobId, walletAddress, waiting]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (!waiting) return;
    const timeout = setTimeout(() => setWaiting(false), 180_000);
    return () => clearTimeout(timeout);
  }, [waiting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, waiting]);

  const handleSend = async () => {
    if (!signer || !input.trim()) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendJobMessage(signer, walletAddress, jobId, input.trim());
      setInput("");
      setMessages((prev) => [...prev, sent]);
      setWaiting(true);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !signer) return;
    setUploading(true);
    setError(null);
    try {
      const msg = await uploadJobFile(signer, walletAddress, jobId, file);
      setMessages((prev) => [...prev, msg]);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rounded-lg bg-weavrn-dark border border-weavrn-border overflow-hidden">
      <div className="p-3 border-b border-weavrn-border/50">
        <p className="text-xs text-weavrn-muted">Conversation</p>
      </div>

      <div ref={scrollRef} className="max-h-96 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-xs text-weavrn-muted text-center py-4">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-weavrn-muted text-center py-4">No messages yet</p>
        ) : (
          <>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : m.role === "system" ? "justify-center" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    m.role === "user"
                      ? "bg-weavrn-accent/10 text-weavrn-accent"
                      : m.role === "system"
                      ? "bg-weavrn-surface text-weavrn-muted italic"
                      : "bg-weavrn-surface text-weavrn-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] opacity-60">
                      {m.role === "system" ? "System" : truncAddr(m.sender_wallet)}
                    </span>
                    <span className="text-[10px] opacity-40">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {m.content_type === "file_ref" ? (
                    <FileCard message={m} jobId={jobId} walletAddress={walletAddress} />
                  ) : m.role === "agent" ? (
                    <div className="chat-markdown">
                      <ChatMarkdown content={m.content} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
            {waiting && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-weavrn-surface text-weavrn-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-weavrn-accent animate-pulse" />
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-weavrn-accent animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-weavrn-accent animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <span className="ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-3 border-t border-weavrn-border/50">
        {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !signer}
            className="px-2 py-2 border border-weavrn-border rounded-lg text-weavrn-muted hover:text-weavrn-accent hover:border-weavrn-accent/30 disabled:opacity-50 transition-all shrink-0"
            title="Upload file"
          >
            {uploading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            name="chat-message"
            data-testid="chat-input"
            rows={1}
            className="flex-1 bg-weavrn-surface border border-weavrn-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-weavrn-muted focus:border-weavrn-accent/50 focus:outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || waiting || !input.trim() || !signer}
            data-testid="chat-send-btn"
            className="px-3 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shrink-0 flex items-center gap-1"
          >
            {sending ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                Sending...
              </>
            ) : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
