"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner, parseEther } from "ethers";
import { getAgentListings, createListing, deactivateListing } from "@/lib/api";
import type { ServiceListing, InputField } from "@/lib/api";

interface Props {
  walletAddress: string;
  agentName: string;
  signer: JsonRpcSigner | null;
}

interface HostedAgent {
  id: number;
  wallet_address: string;
  model_name: string;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  tier: string;
  active: boolean;
  created_at: string;
  job_count?: number;
}

interface Pricing {
  byok: { price_eth: string; description: string };
  managed: { price_eth: string; description: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TEMPLATES: Record<string, { name: string; prompt: string; model: string; temp: number }> = {
  code_review: {
    name: "Code Review Agent",
    prompt: `You are a code review agent. When given a task:\n- Clone the repo if access is provided\n- Review for correctness, security, and maintainability\n- Flag OWASP top 10 vulnerabilities\n- Suggest concrete fixes with code examples\n- Commit changes to the weavrn/job-{id} branch if applicable\n- Structure output as: summary, findings per file, suggested changes`,
    model: "claude-sonnet-4-5-20250929",
    temp: 0.3,
  },
  research: {
    name: "Research Agent",
    prompt: `You are a research analyst. When given a task:\n- Break the problem into sub-questions\n- Analyze from multiple angles with evidence\n- Structure output as: executive summary, methodology, findings, recommendations`,
    model: "claude-sonnet-4-5-20250929",
    temp: 0.5,
  },
  solidity_audit: {
    name: "Solidity Audit Agent",
    prompt: `You are a smart contract auditor. When given a task:\n- Review all .sol files for reentrancy, overflow, access control, and front-running\n- Verify OpenZeppelin usage patterns\n- Run forge build and forge test if available\n- Structure output as severity-classified findings with recommended fixes`,
    model: "claude-sonnet-4-5-20250929",
    temp: 0.2,
  },
  custom: { name: "", prompt: "", model: "claude-haiku-4-5-20251001", temp: 0.5 },
};

const MODELS = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

const CATEGORIES = ["data", "code", "research", "automation", "creative", "trading", "other"];

async function signedFetch(signer: JsonRpcSigner, wallet: string, action: string, path: string, method: string, extra?: Record<string, unknown>) {
  const timestamp = Date.now();
  const message = `weavrn:${action}:${wallet.toLowerCase()}:${timestamp}`;
  const signature = await signer.signMessage(message);
  const body: Record<string, unknown> = { wallet_address: wallet.toLowerCase(), signature, timestamp, ...extra };
  const res = await fetch(`${API_URL}${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Input Field Editor (from MyListings) ──

const FIELD_TYPES: InputField["type"][] = ["text", "textarea", "select", "code", "url", "git_url", "file", "number"];

function emptyField(): InputField {
  return { name: "", label: "", type: "text", required: false };
}

function InputFieldEditor({ field, onChange, onRemove }: { field: InputField; onChange: (f: InputField) => void; onRemove: () => void }) {
  const cls = "w-full px-2 py-1.5 bg-weavrn-surface border border-weavrn-border rounded text-xs focus:outline-none focus:border-weavrn-accent/50";
  return (
    <div className="p-3 rounded-lg bg-weavrn-surface border border-weavrn-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-weavrn-muted uppercase tracking-wider">Field</span>
        <button onClick={onRemove} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Label</label>
          <input value={field.label} onChange={(e) => { const label = e.target.value; const name = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); onChange({ ...field, label, name }); }} placeholder="GitHub Repository URL" className={cls} />
        </div>
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Type</label>
          <select value={field.type} onChange={(e) => onChange({ ...field, type: e.target.value as InputField["type"] })} className={cls}>
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Placeholder</label>
          <input value={field.placeholder || ""} onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })} placeholder="Optional" className={cls} />
        </div>
        <label className="flex items-end gap-1.5 text-xs text-weavrn-muted cursor-pointer pb-1.5">
          <input type="checkbox" checked={field.required} onChange={(e) => onChange({ ...field, required: e.target.checked })} className="rounded border-weavrn-border" />
          Required
        </label>
      </div>
      {field.type === "select" && (
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Options (comma-separated)</label>
          <input value={field.options?.join(", ") || ""} onChange={(e) => onChange({ ...field, options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Option A, Option B" className={cls} />
        </div>
      )}
      {field.type === "file" && (
        <div>
          <label className="text-[10px] text-weavrn-muted block mb-0.5">Accepted extensions</label>
          <input value={field.accept?.join(", ") || ""} onChange={(e) => onChange({ ...field, accept: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder=".py, .ts, .json" className={cls} />
        </div>
      )}
    </div>
  );
}

// ── Inline Listing Manager per Agent ──

function AgentListings({ agentWallet, ownerWallet, signer }: { agentWallet: string; ownerWallet: string; signer: JsonRpcSigner | null }) {
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("code");
  const [pricingType, setPricingType] = useState("fixed");
  const [priceAmount, setPriceAmount] = useState("0.00001");
  const [escrowStrategy, setEscrowStrategy] = useState("all_or_nothing");
  const [tags, setTags] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [inputFields, setInputFields] = useState<InputField[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      const res = await getAgentListings(agentWallet);
      setListings(res.listings || []);
    } catch { /* ignore */ }
  }, [agentWallet]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleCreate = async () => {
    if (!signer || !title || !description) return;
    setCreating(true);
    setError(null);
    try {
      const validFields = inputFields.filter(f => f.name && f.label);
      await createListing(signer, ownerWallet, {
        title,
        description,
        category,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        pricing_type: pricingType,
        price_amount: priceAmount || undefined,
        escrow_strategy: escrowStrategy,
        estimated_duration: estimatedDuration || undefined,
        input_schema: validFields.length > 0 ? validFields : undefined,
        agent_wallet: agentWallet,
      });
      setShowCreate(false);
      setTitle(""); setDescription(""); setTags(""); setPriceAmount("0.00001"); setEstimatedDuration(""); setInputFields([]);
      fetchListings();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to create listing");
    } finally {
      setCreating(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-weavrn-surface border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50";

  return (
    <div className="mt-4 border-t border-weavrn-border/30 pt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Listings</span>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="text-xs text-weavrn-accent hover:text-weavrn-accent-hover">
            + Add Listing
          </button>
        )}
      </div>

      {listings.map(l => (
        <div key={l.id} className="flex items-center justify-between py-2 border-b border-weavrn-border/20 last:border-0">
          <div className="min-w-0">
            <p className="text-sm truncate">{l.title}</p>
            <p className="text-[10px] text-weavrn-muted">{l.category} · {l.price_amount} {l.price_token} · {l.escrow_strategy.replace(/_/g, " ")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <a href={`/marketplace?id=${l.id}`} className="text-[10px] text-weavrn-accent hover:underline">View</a>
            {l.active && signer && (
              <button onClick={async () => { await deactivateListing(signer, ownerWallet, l.id); fetchListings(); }} className="text-[10px] text-red-400 hover:text-red-300">
                Deactivate
              </button>
            )}
          </div>
        </div>
      ))}

      {listings.length === 0 && !showCreate && (
        <p className="text-xs text-weavrn-muted py-2">No listings yet. Add one so this agent can receive jobs.</p>
      )}

      {showCreate && (
        <div className="space-y-3 mt-2 p-4 rounded-lg bg-weavrn-dark border border-weavrn-border">
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Service title" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What this service does, expected inputs, deliverables..." className={inputCls} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Pricing</label>
              <select value={pricingType} onChange={e => setPricingType(e.target.value)} className={inputCls}>
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Price (ETH)</label>
              <input value={priceAmount} onChange={e => setPriceAmount(e.target.value)} placeholder="0.001" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Escrow</label>
              <select value={escrowStrategy} onChange={e => setEscrowStrategy(e.target.value)} className={inputCls}>
                <option value="all_or_nothing">All or Nothing</option>
                <option value="milestone">Milestone</option>
                <option value="trickle">Trickle</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Tags (comma-separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ai, code, review" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-weavrn-muted block mb-1">Estimated Duration</label>
              <input value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} placeholder="2 hours" className={inputCls} />
            </div>
          </div>

          {/* Input Fields Builder */}
          <div className="border-t border-weavrn-border/50 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-weavrn-muted">Input Fields (optional)</label>
              <button onClick={() => { if (inputFields.length < 10) setInputFields([...inputFields, emptyField()]); }} disabled={inputFields.length >= 10}
                className="text-[10px] px-2 py-1 rounded bg-weavrn-accent/10 text-weavrn-accent hover:bg-weavrn-accent/20 disabled:opacity-30 transition-colors">
                + Add Field
              </button>
            </div>
            {inputFields.length === 0 && <p className="text-[10px] text-weavrn-muted/50">No custom fields. Requesters will see generic text inputs.</p>}
            <div className="space-y-2">
              {inputFields.map((field, i) => (
                <InputFieldEditor key={i} field={field}
                  onChange={(updated) => { const next = [...inputFields]; next[i] = updated; setInputFields(next); }}
                  onRemove={() => setInputFields(inputFields.filter((_, j) => j !== i))} />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || !title || !description}
              className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all">
              {creating ? "Creating..." : "Create Listing"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-weavrn-muted hover:text-white">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function AgentSetup({ walletAddress, signer }: Props) {
  const [agents, setAgents] = useState<HostedAgent[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form
  const [creating, setCreating] = useState(false);
  const [tier, setTier] = useState<"managed" | "byok">("byok");
  const [template, setTemplate] = useState("code_review");
  const [agentNameInput, setAgentNameInput] = useState(TEMPLATES.code_review.name);
  const [systemPrompt, setSystemPrompt] = useState(TEMPLATES.code_review.prompt);
  const [model, setModel] = useState(TEMPLATES.code_review.model);
  const [temp, setTemp] = useState(TEMPLATES.code_review.temp);
  const [userApiKey, setUserApiKey] = useState("");
  const [deploying, setDeploying] = useState(false);

  // Edit state
  const [editing, setEditing] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  const fetchAgents = useCallback(async () => {
    if (!signer) return;
    try {
      const timestamp = Date.now();
      const message = `weavrn:list-hosted:${walletAddress.toLowerCase()}:${timestamp}`;
      const signature = await signer.signMessage(message);
      const params = new URLSearchParams({ wallet_address: walletAddress.toLowerCase(), signature, timestamp: String(timestamp) });
      const res = await fetch(`${API_URL}/hosted-agents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch { /* ignore */ }
  }, [walletAddress, signer]);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/hosted-agents/pricing`);
      if (res.ok) setPricing(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAgents(); fetchPricing(); }, [fetchAgents, fetchPricing]);

  const handleTemplateChange = (t: string) => {
    setTemplate(t);
    if (TEMPLATES[t]) {
      setAgentNameInput(TEMPLATES[t].name);
      setSystemPrompt(TEMPLATES[t].prompt);
      setModel(TEMPLATES[t].model);
      setTemp(TEMPLATES[t].temp);
    }
  };

  const handleDeploy = async () => {
    if (!signer) return;
    setDeploying(true);
    setError(null);
    setSuccess(null);
    try {
      const price = tier === "managed" ? pricing?.managed.price_eth : pricing?.byok.price_eth;
      if (!price) throw new Error("Pricing not loaded");
      const tx = await signer.sendTransaction({
        to: "0x9bB50598DDa4557d54a62464DA30Efdb9ffC2d7c",
        value: parseEther(price),
      });
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Payment transaction failed");
      const result = await signedFetch(signer, walletAddress, "create-hosted-agent", "/hosted-agents", "POST", {
        tier,
        name: agentNameInput || "My Agent",
        system_prompt: systemPrompt,
        model_name: model,
        max_tokens: 8192,
        temperature: temp,
        user_api_key: tier === "byok" ? userApiKey : undefined,
        payment_tx: receipt.hash,
      });
      setSuccess(`Agent deployed at ${result.agent.wallet_address.slice(0, 10)}... — add a listing below to start receiving jobs.`);
      setCreating(false);
      fetchAgents();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleUpdate = async (agentId: number) => {
    if (!signer) return;
    try {
      await signedFetch(signer, walletAddress, "update-hosted-agent", `/hosted-agents/${agentId}`, "PUT", { system_prompt: editPrompt });
      setEditing(null);
      fetchAgents();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Update failed");
    }
  };

  const handleToggle = async (agentId: number, active: boolean) => {
    if (!signer) return;
    try {
      await signedFetch(signer, walletAddress, "update-hosted-agent", `/hosted-agents/${agentId}`, "PUT", { active: !active });
      fetchAgents();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Toggle failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">My Agents</h2>
          <p className="text-sm text-weavrn-muted">Deploy AI agents to offer services on the marketplace</p>
        </div>
        {!creating && agents.length > 0 && (
          <button onClick={() => setCreating(true)} className="px-4 py-2 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all">
            + Deploy Agent
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-xs hover:text-white ml-4">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex justify-between">
          {success}
          <button onClick={() => setSuccess(null)} className="text-xs hover:text-white ml-4">Dismiss</button>
        </div>
      )}

      {/* Agent cards with nested listings */}
      {agents.map((a) => (
        <div key={a.id} className="glow-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{a.system_prompt.split("\n")[0].slice(0, 50) || a.wallet_address.slice(0, 12) + "..."}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.tier === "managed" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                {a.tier === "managed" ? "Managed" : "BYOK"}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {a.active ? "Active" : "Paused"}
              </span>
            </div>
            <button onClick={() => handleToggle(a.id, a.active)} className="text-xs text-weavrn-muted hover:text-white">
              {a.active ? "Pause" : "Resume"}
            </button>
          </div>
          <div className="text-xs text-weavrn-muted mb-3">
            <span className="font-mono">{a.wallet_address.slice(0, 10)}...{a.wallet_address.slice(-6)}</span>
            {" · "}{a.model_name} · {a.job_count || 0} jobs
          </div>

          {editing === a.id ? (
            <div className="space-y-2">
              <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={4} className="w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-xs font-mono resize-y" />
              <div className="flex gap-2">
                <button onClick={() => handleUpdate(a.id)} className="px-3 py-1 text-xs bg-weavrn-accent text-black rounded font-semibold">Save</button>
                <button onClick={() => setEditing(null)} className="px-3 py-1 text-xs text-weavrn-muted hover:text-white">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setEditing(a.id); setEditPrompt(a.system_prompt); }} className="text-xs text-weavrn-accent hover:text-weavrn-accent-hover">
              Edit system prompt
            </button>
          )}

          {/* Nested listings for this agent */}
          <AgentListings agentWallet={a.wallet_address} ownerWallet={walletAddress} signer={signer} />
        </div>
      ))}

      {/* Empty state / Create flow */}
      {!creating && agents.length === 0 && (
        <div className="glow-card rounded-xl p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">No agents deployed yet</h3>
          <p className="text-sm text-weavrn-muted mb-6">Deploy an AI agent to start offering services on the marketplace. Each agent gets its own wallet and can process jobs autonomously.</p>
          <button onClick={() => setCreating(true)} className="px-6 py-3 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg font-semibold transition-all">
            Deploy Your First Agent
          </button>
        </div>
      )}

      {creating && (
        <div className="glow-card rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Deploy New Agent</h3>
            <button onClick={() => setCreating(false)} className="text-xs text-weavrn-muted hover:text-white">Cancel</button>
          </div>

          {/* Tier */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTier("byok")} className={`p-4 rounded-lg border text-left transition-colors ${tier === "byok" ? "border-weavrn-accent bg-weavrn-accent/5" : "border-weavrn-border hover:border-weavrn-accent/30"}`}>
              <p className="text-sm font-semibold">Bring Your Own Key</p>
              <p className="text-xs text-weavrn-muted mt-1">Use your own API key. We run the infrastructure.</p>
              <p className="text-lg font-bold text-weavrn-accent mt-2">{pricing?.byok.price_eth || "..."} ETH<span className="text-xs text-weavrn-muted font-normal"> one-time</span></p>
            </button>
            <button onClick={() => setTier("managed")} className={`p-4 rounded-lg border text-left transition-colors ${tier === "managed" ? "border-weavrn-accent bg-weavrn-accent/5" : "border-weavrn-border hover:border-weavrn-accent/30"}`}>
              <p className="text-sm font-semibold">Fully Managed</p>
              <p className="text-xs text-weavrn-muted mt-1">We provide the AI. Just configure your agent.</p>
              <p className="text-lg font-bold text-weavrn-accent mt-2">{pricing?.managed.price_eth || "..."} ETH<span className="text-xs text-weavrn-muted font-normal"> one-time</span></p>
            </button>
          </div>

          {/* Template */}
          <div>
            <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Template</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button key={key} onClick={() => handleTemplateChange(key)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${template === key ? "bg-weavrn-accent text-black" : "bg-weavrn-surface border border-weavrn-border text-weavrn-muted hover:text-white"}`}>
                  {key === "custom" ? "Custom" : t.name.replace(" Agent", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Agent Name</label>
              <input value={agentNameInput} onChange={e => setAgentNameInput(e.target.value)} className="mt-1 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm" placeholder="My Agent" />
            </div>
            <div>
              <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Model</label>
              <select value={model} onChange={e => setModel(e.target.value)} className="mt-1 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm">
                {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">System Prompt</label>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={6} className="mt-1 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm font-mono resize-y" />
          </div>

          {/* Temperature */}
          <div>
            <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Temperature: {temp}</label>
            <input type="range" min="0" max="1" step="0.1" value={temp} onChange={e => setTemp(parseFloat(e.target.value))} className="mt-1 w-full" />
          </div>

          {/* BYOK API Key */}
          {tier === "byok" && (
            <div>
              <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Your API Key</label>
              <input type="password" value={userApiKey} onChange={e => setUserApiKey(e.target.value)} className="mt-1 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm font-mono" placeholder={model.startsWith("claude") ? "sk-ant-..." : "sk-..."} />
              <p className="text-[10px] text-weavrn-muted mt-1">Encrypted at rest. Never visible after submission.</p>
            </div>
          )}

          <button onClick={handleDeploy} disabled={deploying || !signer || !systemPrompt || (tier === "byok" && !userApiKey)}
            className="w-full py-3 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg font-semibold disabled:opacity-50 transition-all">
            {deploying ? "Deploying..." : `Pay ${tier === "managed" ? pricing?.managed.price_eth || "..." : pricing?.byok.price_eth || "..."} ETH & Deploy`}
          </button>

          <p className="text-[10px] text-weavrn-muted text-center">
            One-time setup fee. After deploying, add a listing to your agent to start receiving jobs.
          </p>
        </div>
      )}
    </div>
  );
}
