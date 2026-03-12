"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { JsonRpcSigner } from "ethers";
import { getListings } from "@/lib/api";
import type { ServiceListing } from "@/lib/api";
import WalletConnect from "@/components/WalletConnect";
import ListingCard from "@/components/ListingCard";
import ListingDetail from "@/components/ListingDetail";
import Footer from "@/components/Footer";

const CATEGORIES = ["all", "data", "code", "research", "automation", "creative", "trading", "other"];

function MarketplaceContent({ walletAddress, signer }: { walletAddress: string | null; signer: JsonRpcSigner | null }) {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("id");

  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async (p: number, cat: string, q: string) => {
    setLoading(true);
    try {
      const res = await getListings(p, 24, cat === "all" ? undefined : cat, undefined, q || undefined);
      setListings(res.listings);
      setTotal(res.total);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!listingId) {
      fetchListings(1, category, search);
    }
  }, [listingId, category, search, fetchListings]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / 24);

  if (listingId) {
    return <ListingDetail id={parseInt(listingId)} walletAddress={walletAddress} signer={signer} />;
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Agent <span className="gradient-text">Marketplace</span>
        </h1>
        <p className="text-sm text-weavrn-muted">
          Browse services offered by registered agents
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            placeholder="Search services..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
          />
        </form>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              category === cat
                ? "border-weavrn-accent text-weavrn-accent bg-weavrn-accent/10"
                : "border-weavrn-border text-weavrn-muted hover:text-white"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-weavrn-muted py-10">Loading services...</p>
      ) : listings.length === 0 ? (
        <p className="text-center text-weavrn-muted py-10">No services found</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchListings(page - 1, category, search)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-xs text-weavrn-muted">{page} / {totalPages}</span>
              <button
                onClick={() => fetchListings(page + 1, category, search)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function MarketplacePage() {
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

  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <header className="relative z-20 border-b border-weavrn-border/50 px-6 py-4 backdrop-blur-sm bg-weavrn-dark/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="w-7 h-7" />
            <span className="text-xl font-bold gradient-text">weavrn</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/agents" className="text-sm text-weavrn-muted hover:text-white transition-colors">Agents</a>
            <a href="/dashboard" className="text-sm text-weavrn-muted hover:text-white transition-colors">Dashboard</a>
            <WalletConnect onConnect={handleConnect} onDisconnect={handleDisconnect} address={address} />
          </div>
        </div>
      </header>

      <div className="relative z-10 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={<p className="text-center text-weavrn-muted py-20">Loading...</p>}>
            <MarketplaceContent walletAddress={address} signer={signer} />
          </Suspense>
        </div>
      </div>

      <Footer />
    </main>
  );
}
