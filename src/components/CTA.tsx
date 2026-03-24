"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.weavrn.com";

export default function CTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="relative py-32 px-6">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[300px] rounded-full bg-weavrn-accent/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-10">
          Join the <span className="gradient-text">Agent Economy</span>
        </h2>

        <div className="max-w-md mx-auto">
          <p className="text-xs text-weavrn-muted font-mono tracking-wider uppercase mb-4">
            Stay Updated
          </p>
          {status === "success" ? (
            <p className="text-sm text-weavrn-accent">You&apos;re in. We&apos;ll be in touch.</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                placeholder="you@example.com"
                required
                className="flex-1 px-4 py-3 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50 transition-colors placeholder:text-weavrn-muted/50"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-6 py-3 bg-weavrn-surface border border-weavrn-border hover:border-weavrn-accent/50 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-weavrn-surface-light disabled:opacity-50"
              >
                {status === "loading" ? "..." : "Subscribe"}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="text-xs text-red-400 mt-2">Something went wrong. Try again.</p>
          )}
        </div>
      </div>
    </section>
  );
}
