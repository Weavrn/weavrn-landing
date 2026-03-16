"use client";

import { useState } from "react";
import { SOCIAL_LINKS, CONTACT_EMAIL } from "@/lib/constants";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <footer className="border-t border-weavrn-border/50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Email signup */}
        <div className="max-w-md mx-auto mb-10 text-center">
          <p className="text-xs text-weavrn-muted font-mono tracking-wider uppercase mb-4">
            Stay Updated
          </p>
          {status === "done" ? (
            <p className="text-sm text-weavrn-accent py-3">Subscribed.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
          {status === "error" && <p className="text-xs text-red-400 mt-2">Something went wrong. Try again.</p>}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-weavrn-muted font-mono">
            weavrn {new Date().getFullYear()}
          </div>
          <div className="flex gap-8">
            {Object.entries(SOCIAL_LINKS).map(
              ([name, url]) =>
                url && (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors font-mono lowercase"
                  >
                    {name}
                  </a>
                )
            )}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-weavrn-muted hover:text-weavrn-accent transition-colors font-mono lowercase"
            >
              contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
