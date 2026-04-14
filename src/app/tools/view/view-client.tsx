"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JsonRpcSigner } from "ethers";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { getTool, type ToolDetail } from "@/lib/api";
import { ToolDetailView, errorMessage } from "./tool-detail";

export default function ToolViewPage(): JSX.Element {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");
  const slug = searchParams.get("slug");

  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  const handleConnect = useCallback((addr: string, s: JsonRpcSigner) => {
    setAddress(addr);
    setSigner(s);
  }, []);

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
  }, []);

  useEffect(() => {
    if (!provider || !slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    (async () => {
      try {
        const data = await getTool(provider, slug);
        if (cancelled) return;
        setTool(data);
      } catch (err) {
        if (cancelled) return;
        const msg = errorMessage(err);
        if (/not found/i.test(msg)) {
          setNotFound(true);
        } else {
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, slug]);

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <AppHeader
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        address={address}
      />

      <div className="relative z-10 px-6 py-16">
        {loading ? (
          <p className="text-center text-weavrn-muted py-20">Loading tool…</p>
        ) : notFound ? (
          <div className="max-w-md mx-auto glow-card rounded-xl p-10 text-center">
            <p className="text-sm text-weavrn-muted mb-4">Tool not found</p>
            <a
              href="/tools"
              className="text-xs text-weavrn-accent hover:underline"
            >
              Back to tools
            </a>
          </div>
        ) : loadError ? (
          <div className="max-w-md mx-auto glow-card rounded-xl p-10 text-center">
            <p className="text-sm text-red-400 mb-4">{loadError}</p>
            <a
              href="/tools"
              className="text-xs text-weavrn-accent hover:underline"
            >
              Back to tools
            </a>
          </div>
        ) : tool ? (
          <ToolDetailView
            tool={tool}
            walletAddress={address}
            signer={signer}
          />
        ) : null}
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}
