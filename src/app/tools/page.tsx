"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { listTools } from "@/lib/api";
import type { ToolSummary, ListToolsFilters } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import ToolCard from "@/components/ToolCard";
import Footer from "@/components/Footer";

const TOOL_CATEGORIES = [
  "image_generation",
  "video_generation",
  "audio_generation",
  "speech_to_text",
  "text_generation",
  "vision",
  "code_execution",
  "data_extraction",
  "web_search",
  "embedding",
  "translation",
  "other",
] as const;

type SortOption = "trust" | "price" | "popularity";

type ExecutionModeFilter = "any" | "manual" | "hosted" | "byo";

const CONTENT_TYPE_OPTIONS = [
  { value: "", label: "Any output type" },
  { value: "text", label: "text" },
  { value: "json", label: "json" },
  { value: "image/png", label: "image/png" },
  { value: "image/jpeg", label: "image/jpeg" },
  { value: "audio/mpeg", label: "audio/mpeg" },
  { value: "video/mp4", label: "video/mp4" },
  { value: "application/octet-stream", label: "application/octet-stream" },
] as const;

function prettyCategory(cat: string) {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ToolsContent() {
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [category, setCategory] = useState<string>("all");
  const [executionMode, setExecutionMode] = useState<ExecutionModeFilter>("any");
  const [contentType, setContentType] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("trust");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce search input -> search
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const buildFilters = useCallback(
    (cursor: string | null): ListToolsFilters => {
      const f: ListToolsFilters = { limit: 24, sort };
      if (category !== "all") f.tool_category = category;
      if (executionMode !== "any") f.execution_mode = executionMode;
      if (contentType) f.content_type = contentType;
      if (search) f.search = search;
      if (cursor) f.cursor = cursor;
      return f;
    },
    [category, executionMode, contentType, sort, search],
  );

  const latestRequestRef = useRef(0);

  const fetchInitial = useCallback(async () => {
    const reqId = ++latestRequestRef.current;
    setLoading(true);
    try {
      const res = await listTools(buildFilters(null));
      if (reqId !== latestRequestRef.current) return;
      setTools(res.tools);
      setNextCursor(res.next_cursor);
    } catch {
      if (reqId !== latestRequestRef.current) return;
      setTools([]);
      setNextCursor(null);
    } finally {
      if (reqId === latestRequestRef.current) setLoading(false);
    }
  }, [buildFilters]);

  const fetchMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listTools(buildFilters(nextCursor));
      setTools((prev) => [...prev, ...res.tools]);
      setNextCursor(res.next_cursor);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [buildFilters, nextCursor, loadingMore]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          <span className="gradient-text">Tools</span>
        </h1>
        <p className="text-sm text-weavrn-muted">
          Discover MCP-style tools you can invoke programmatically
        </p>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search tools..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
          aria-label="Sort tools"
        >
          <option value="trust">Trust</option>
          <option value="price">Price</option>
          <option value="popularity">Popularity</option>
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          key="all"
          onClick={() => setCategory("all")}
          className={`px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border transition-colors ${
            category === "all"
              ? "border-weavrn-accent text-weavrn-accent bg-weavrn-accent/10"
              : "border-weavrn-border text-gray-300 bg-weavrn-surface hover:text-white hover:border-gray-500"
          }`}
        >
          All
        </button>
        {TOOL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border transition-colors ${
              category === cat
                ? "border-weavrn-accent text-weavrn-accent bg-weavrn-accent/10"
                : "border-weavrn-border text-gray-300 bg-weavrn-surface hover:text-white hover:border-gray-500"
            }`}
          >
            {prettyCategory(cat)}
          </button>
        ))}
      </div>

      {/* Execution mode + content type filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-weavrn-muted py-1.5">Execution:</span>
          {(["any", "manual", "hosted", "byo"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setExecutionMode(m)}
              className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                executionMode === m
                  ? "border-blue-400 text-blue-400 bg-blue-500/10"
                  : "border-weavrn-border text-weavrn-muted hover:text-white"
              }`}
            >
              {m === "byo" ? "BYO" : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <label htmlFor="tool-content-type" className="text-xs text-weavrn-muted">
            Output:
          </label>
          <select
            id="tool-content-type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="px-3 py-1.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-xs text-weavrn-muted focus:outline-none focus:border-weavrn-accent/50"
          >
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-weavrn-muted py-10">Loading tools...</p>
      ) : tools.length === 0 ? (
        <div className="glow-card rounded-xl p-10 text-center max-w-md mx-auto">
          <p className="text-sm text-weavrn-muted">No tools match your filters</p>
        </div>
      ) : (
        <>
          <div
            role="list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
          >
            {tools.map((t) => (
              <div role="listitem" key={t.id}>
                <ToolCard tool={t} />
              </div>
            ))}
          </div>

          {nextCursor && (
            <div className="flex items-center justify-center">
              <button
                onClick={fetchMore}
                disabled={loadingMore}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-weavrn-border text-gray-300 bg-weavrn-surface hover:text-white hover:border-gray-500 disabled:opacity-30"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function ToolsPage() {
  return (
    <main className="min-h-screen noise">
      <div className="bg-grid absolute inset-0" />

      <AppHeader showWallet={false} />

      <div className="relative z-10 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <Suspense fallback={<p className="text-center text-weavrn-muted py-20">Loading...</p>}>
            <ToolsContent />
          </Suspense>
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </main>
  );
}
