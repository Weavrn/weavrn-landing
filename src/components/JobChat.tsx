"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { JsonRpcSigner } from "ethers";
import { getJobMessages, sendJobMessage } from "@/lib/api";
import type { JobMessage } from "@/lib/api";

interface Props {
  jobId: number;
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
    if (!signer) return;
    try {
      const res = await getJobMessages(signer, walletAddress, jobId);
      setMessages((prev) => {
        if (res.messages.length !== prev.length) {
          // New messages arrived — stop waiting
          if (res.messages.length > prev.length && waiting) {
            const lastMsg = res.messages[res.messages.length - 1];
            if (lastMsg.role === "agent" || lastMsg.role === "system") {
              setWaiting(false);
            }
          }
          return res.messages;
        }
        return prev;
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [jobId, walletAddress, signer, waiting]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll every 3s while chat is open
  useEffect(() => {
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Auto-scroll on new messages
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
      // Optimistically add the user message
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

      <div ref={scrollRef} className="max-h-80 overflow-y-auto p-3 space-y-2">
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
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                    m.role === "user"
                      ? "bg-weavrn-accent/10 text-weavrn-accent"
                      : m.role === "system"
                      ? "bg-weavrn-surface text-weavrn-muted italic"
                      : "bg-weavrn-surface text-white"
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
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {/* Thinking indicator */}
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
