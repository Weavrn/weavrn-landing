"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAgents } from "@/lib/api";
import type { AgentListItem } from "@/lib/api";
import AgentCard from "@/components/AgentCard";
import AgentProfile from "@/components/AgentProfile";
import Footer from "@/components/Footer";

type SortOption = "newest" | "volume" | "payments";

function AgentsContent() {
  const searchParams = useSearchParams();
  const walletParam = searchParams.get("wallet");

  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async (p: number, s: SortOption, q: string) => {
    setLoading(true);
    try {
      const res = await getAgents(p, 24, s, q || undefined);
      setAgents(res.agents);
      setTotal(res.total);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!walletParam) {
      fetchAgents(1, sort, search);
    }
  }, [walletParam, sort, search, fetchAgents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const totalPages = Math.ceil(total / 24);

  if (walletParam) {
    return <AgentProfile wallet={walletParam} />;
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Agent <span className="gradient-text">Directory</span>
        </h1>
        <p className="text-sm text-weavrn-muted">
          Browse registered agents on Weavrn
        </p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
          />
        </form>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
        >
          <option value="newest">Newest</option>
          <option value="volume">Volume</option>
          <option value="payments">Payments</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-weavrn-muted py-10">Loading agents...</p>
      ) : agents.length === 0 ? (
        <p className="text-center text-weavrn-muted py-10">No agents found</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {agents.map((a) => (
              <AgentCard key={a.agent_id} agent={a} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchAgents(page - 1, sort, search)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs border border-weavrn-border text-weavrn-muted hover:text-white disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-xs text-weavrn-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => fetchAgents(page + 1, sort, search)}
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

export default function AgentsPage() {
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
            <a href="/dashboard" className="text-sm text-weavrn-muted hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="/mine" className="text-sm text-weavrn-muted hover:text-white transition-colors">
              Mining
            </a>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={<p className="text-center text-weavrn-muted py-20">Loading...</p>}>
            <AgentsContent />
          </Suspense>
        </div>
      </div>

      <Footer />
    </main>
  );
}
