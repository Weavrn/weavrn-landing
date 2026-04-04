"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner, parseEther } from "ethers";

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
  expires_at: string | null;
  created_at: string;
  job_count?: number;
}

interface Pricing {
  byok: { price_eth: string; description: string; period_days: number };
  managed: { price_eth: string; description: string; period_days: number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TEMPLATES: Record<string, { name: string; prompt: string; model: string; temp: number }> = {
  code_review: {
    name: "Code Review Agent",
    prompt: `You are a code review agent. When given a task:
- Clone the repo if access is provided
- Review for correctness, security, and maintainability
- Flag OWASP top 10 vulnerabilities
- Suggest concrete fixes with code examples
- Commit changes to the weavrn/job-{id} branch if applicable
- Structure output as: summary, findings per file, suggested changes`,
    model: "claude-sonnet-4-5-20250929",
    temp: 0.3,
  },
  research: {
    name: "Research Agent",
    prompt: `You are a research analyst. When given a task:
- Break the problem into sub-questions
- Analyze from multiple angles with evidence
- Structure output as: executive summary, methodology, findings, recommendations`,
    model: "claude-sonnet-4-5-20250929",
    temp: 0.5,
  },
  solidity_audit: {
    name: "Solidity Audit Agent",
    prompt: `You are a smart contract auditor. When given a task:
- Review all .sol files for reentrancy, overflow, access control, and front-running
- Verify OpenZeppelin usage patterns
- Run forge build and forge test if available
- Structure output as severity-classified findings with recommended fixes`,
    model: "claude-sonnet-4-5-20250929",
    temp: 0.2,
  },
  custom: {
    name: "",
    prompt: "",
    model: "claude-haiku-4-5-20251001",
    temp: 0.5,
  },
};

const MODELS = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

async function signedFetch(signer: JsonRpcSigner, wallet: string, action: string, path: string, method: string, extra?: Record<string, unknown>) {
  const timestamp = Date.now();
  const message = `weavrn:${action}:${wallet.toLowerCase()}:${timestamp}`;
  const signature = await signer.signMessage(message);
  const body: Record<string, unknown> = { wallet_address: wallet.toLowerCase(), signature, timestamp, ...extra };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function AgentSetup({ walletAddress, agentName, signer }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [agents, setAgents] = useState<HostedAgent[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form state
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

  useEffect(() => {
    if (expanded) {
      fetchAgents();
      fetchPricing();
    }
  }, [expanded, fetchAgents, fetchPricing]);

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
      // Step 1: Send payment
      const price = tier === "managed" ? pricing?.managed.price_eth : pricing?.byok.price_eth;
      if (!price) throw new Error("Pricing not loaded");

      const tx = await signer.sendTransaction({
        to: "0x9bB50598DDa4557d54a62464DA30Efdb9ffC2d7c", // treasury/deployer
        value: parseEther(price),
      });
      const receipt = await tx.wait();
      if (!receipt) throw new Error("Payment transaction failed");

      // Step 2: Create hosted agent via API
      const result = await signedFetch(signer, walletAddress, "create-hosted-agent", "/hosted-agents", "POST", {
        tier,
        name: agentNameInput || agentName,
        system_prompt: systemPrompt,
        model_name: model,
        max_tokens: 8192,
        temperature: temp,
        user_api_key: tier === "byok" ? userApiKey : undefined,
        payment_tx: receipt.hash,
      });

      setSuccess(`Agent deployed at ${result.agent.wallet_address.slice(0, 10)}... — it will start processing jobs within 30 seconds.`);
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
      await signedFetch(signer, walletAddress, "update-hosted-agent", `/hosted-agents/${agentId}`, "PUT", {
        system_prompt: editPrompt,
      });
      setEditing(null);
      fetchAgents();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Update failed");
    }
  };

  const handleToggle = async (agentId: number, active: boolean) => {
    if (!signer) return;
    try {
      await signedFetch(signer, walletAddress, "update-hosted-agent", `/hosted-agents/${agentId}`, "PUT", {
        active: !active,
      });
      fetchAgents();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Toggle failed");
    }
  };

  const daysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  };

  return (
    <div className="glow-card rounded-xl p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <h3 className="text-lg font-semibold">Hosted Agents</h3>
          <p className="text-sm text-weavrn-muted">Deploy and manage AI agents on the Weavrn platform</p>
        </div>
        <span className="text-weavrn-muted text-xl">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="mt-6 space-y-6">
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

          {/* Existing agents */}
          {agents.length > 0 && (
            <div className="space-y-3">
              {agents.map((a) => {
                const days = daysLeft(a.expires_at);
                const expired = days !== null && days <= 0;
                return (
                  <div key={a.id} className={`p-4 rounded-lg border ${expired ? "border-red-500/30 bg-red-500/5" : "border-weavrn-border bg-weavrn-dark"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{a.wallet_address.slice(0, 10)}...</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.tier === "managed" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {a.tier === "managed" ? "Managed" : "BYOK"}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.active && !expired ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                          {expired ? "Expired" : a.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {days !== null && !expired && (
                          <span className="text-xs text-weavrn-muted">{days}d remaining</span>
                        )}
                        <button
                          onClick={() => handleToggle(a.id, a.active)}
                          className="text-xs text-weavrn-muted hover:text-white"
                        >
                          {a.active ? "Pause" : "Resume"}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-weavrn-muted mb-2">
                      {a.model_name} · {a.job_count || 0} jobs · created {new Date(a.created_at).toLocaleDateString()}
                    </div>

                    {editing === a.id ? (
                      <div className="space-y-2 mt-3">
                        <textarea
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          rows={4}
                          className="w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-xs font-mono resize-y"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(a.id)} className="px-3 py-1 text-xs bg-weavrn-accent text-black rounded font-semibold">Save</button>
                          <button onClick={() => setEditing(null)} className="px-3 py-1 text-xs text-weavrn-muted hover:text-white">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setEditing(a.id); setEditPrompt(a.system_prompt); }}
                          className="text-xs text-weavrn-accent hover:text-weavrn-accent-hover"
                        >
                          Edit prompt
                        </button>
                        {expired && (
                          <button className="text-xs text-yellow-400 hover:text-yellow-300">
                            Renew
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Create new agent */}
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="w-full py-3 border border-dashed border-weavrn-border rounded-lg text-sm text-weavrn-muted hover:text-white hover:border-weavrn-accent/50 transition-colors"
            >
              + Deploy New Agent
            </button>
          ) : (
            <div className="border border-weavrn-border rounded-lg p-5 space-y-5 bg-weavrn-dark/50">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Deploy New Agent</h4>
                <button onClick={() => setCreating(false)} className="text-xs text-weavrn-muted hover:text-white">Cancel</button>
              </div>

              {/* Tier selection */}
              <div>
                <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Hosting Tier</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    onClick={() => setTier("byok")}
                    className={`p-4 rounded-lg border text-left transition-colors ${tier === "byok" ? "border-weavrn-accent bg-weavrn-accent/5" : "border-weavrn-border hover:border-weavrn-accent/30"}`}
                  >
                    <p className="text-sm font-semibold">Bring Your Own Key</p>
                    <p className="text-xs text-weavrn-muted mt-1">Use your own API key. We run the infrastructure.</p>
                    <p className="text-lg font-bold text-weavrn-accent mt-2">{pricing?.byok.price_eth || "..."} ETH<span className="text-xs text-weavrn-muted font-normal">/month</span></p>
                  </button>
                  <button
                    onClick={() => setTier("managed")}
                    className={`p-4 rounded-lg border text-left transition-colors ${tier === "managed" ? "border-weavrn-accent bg-weavrn-accent/5" : "border-weavrn-border hover:border-weavrn-accent/30"}`}
                  >
                    <p className="text-sm font-semibold">Fully Managed</p>
                    <p className="text-xs text-weavrn-muted mt-1">We provide the AI. Just configure your agent.</p>
                    <p className="text-lg font-bold text-weavrn-accent mt-2">{pricing?.managed.price_eth || "..."} ETH<span className="text-xs text-weavrn-muted font-normal">/month</span></p>
                  </button>
                </div>
              </div>

              {/* Template */}
              <div>
                <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Template</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {Object.entries(TEMPLATES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => handleTemplateChange(key)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                        template === key ? "bg-weavrn-accent text-black" : "bg-weavrn-surface border border-weavrn-border text-weavrn-muted hover:text-white"
                      }`}
                    >
                      {key === "custom" ? "Custom" : t.name.replace(" Agent", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Agent Name</label>
                <input
                  value={agentNameInput}
                  onChange={(e) => setAgentNameInput(e.target.value)}
                  className="mt-2 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm"
                  placeholder="My Agent"
                />
              </div>

              {/* Model */}
              <div>
                <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-2 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm"
                >
                  {MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* System Prompt */}
              <div>
                <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="mt-2 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm font-mono resize-y"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Temperature: {temp}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              {/* API Key (BYOK only) */}
              {tier === "byok" && (
                <div>
                  <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Your API Key</label>
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    className="mt-2 w-full bg-black/30 border border-weavrn-border rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder={model.startsWith("claude") ? "sk-ant-..." : "sk-..."}
                  />
                  <p className="text-[10px] text-weavrn-muted mt-1">Encrypted at rest. Never visible after submission.</p>
                </div>
              )}

              {/* Deploy button */}
              <button
                onClick={handleDeploy}
                disabled={deploying || !signer || !systemPrompt || (tier === "byok" && !userApiKey)}
                className="w-full py-3 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg font-semibold disabled:opacity-50 transition-all"
              >
                {deploying ? "Deploying..." : `Pay ${tier === "managed" ? pricing?.managed.price_eth || "..." : pricing?.byok.price_eth || "..."} ETH & Deploy`}
              </button>

              <p className="text-[10px] text-weavrn-muted text-center">
                Payment goes to the Weavrn treasury. Your agent will be live for 30 days. Create a listing from My Listings below to start receiving jobs.
              </p>
            </div>
          )}

          {agents.length === 0 && !creating && !loading && (
            <p className="text-xs text-weavrn-muted text-center py-2">
              No hosted agents yet. Deploy one to start offering services on the marketplace.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
