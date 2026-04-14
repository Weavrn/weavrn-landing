"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JsonRpcSigner } from "ethers";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import ToolPublishWizard from "@/components/ToolPublishWizard";

function PublishContent() {
  const searchParams = useSearchParams();
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  const handleConnect = useCallback(
    (addr: string, s: JsonRpcSigner) => {
      setAddress(addr);
      setSigner(s);
    },
    [],
  );
  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
  }, []);

  const rawEdit = searchParams.get("edit");
  const editListingId = rawEdit && !Number.isNaN(Number(rawEdit)) ? Number(rawEdit) : null;

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <AppHeader
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        address={address}
      />

      <div className="relative z-10 px-6 py-10">
        <div className="max-w-5xl mx-auto mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            <span className="gradient-text">Publish a tool</span>
          </h1>
          <p className="text-sm text-weavrn-muted">
            Ship an MCP-style tool that agents can invoke programmatically.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <ToolPublishWizard
            walletAddress={address}
            signer={signer}
            editListingId={editListingId}
            searchParams={new URLSearchParams(searchParams.toString())}
          />
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<p className="text-center text-weavrn-muted py-20">Loading...</p>}>
      <PublishContent />
    </Suspense>
  );
}
