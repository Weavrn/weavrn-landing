"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { JsonRpcSigner } from "ethers";
import { sendJobMessage } from "@/lib/api";
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
        a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-weavrn-accent hover:underline">{children}</a>; },
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

export default function JobChat({ jobId, walletAddress, signer }: Props) {
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_URL}/jobs/${jobId}/messages?wallet_address=${walletAddress.toLowerCase()}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages((prev) => {
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
                  {m.role === "agent" ? (
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
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-weavrn-surface border border-weavrn-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-weavrn-muted focus:border-weavrn-accent/50 focus:outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || waiting || !input.trim() || !signer}
            className="px-3 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shrink-0"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
