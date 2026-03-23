"use client";

import { useState } from "react";
import { SOCIAL_LINKS, CONTACT_EMAIL } from "@/lib/constants";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.weavrn.com";

export default function Footer() {
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
    <footer className="border-t border-weavrn-border/50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="max-w-md mx-auto mb-10 text-center">
          <p className="text-xs text-weavrn-muted font-mono tracking-wider uppercase mb-4">
            Stay Updated
          </p>
          {status === "success" ? (
            <p className="text-sm text-[#00D4AA]">You&apos;re in. We&apos;ll be in touch.</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                placeholder="you@example.com"
                required
                className="flex-1 px-4 py-3 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-[#00D4AA]/50 transition-colors placeholder:text-weavrn-muted/50"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-6 py-3 bg-weavrn-surface border border-weavrn-border hover:border-[#00D4AA]/50 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50"
              >
                {status === "loading" ? "..." : "Subscribe"}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="text-xs text-red-400 mt-2">Something went wrong. Try again.</p>
          )}
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
                    className="text-sm text-weavrn-muted hover:text-[#00D4AA] transition-colors font-mono lowercase"
                  >
                    {name}
                  </a>
                )
            )}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-weavrn-muted hover:text-[#00D4AA] transition-colors font-mono lowercase"
            >
              contact
            </a>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-weavrn-border/30 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-6">
            {["Terms", "Privacy", "Disclaimer"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-weavrn-muted/60 hover:text-weavrn-muted transition-colors font-mono"
              >
                {link}
              </a>
            ))}
          </div>
          <p className="text-xs text-weavrn-muted/40 text-center sm:text-right max-w-md">
            WVRN is a utility token. Nothing on this site constitutes financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
