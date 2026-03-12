"use client";

import { useState } from "react";
import { JsonRpcSigner } from "ethers";
import { registerAgent, updateAgentOnChain } from "@/lib/contracts";
import { getExplorerTxUrl } from "@/lib/contracts";

interface AgentInfo {
  agentId: number;
  name: string;
  metadataURI: string;
  active: boolean;
  isRegistered: boolean;
}

interface Props {
  agent: AgentInfo | null;
  signer: JsonRpcSigner | null;
  onRegistered: () => void;
}

export default function AgentRegistration({ agent, signer, onRegistered }: Props) {
  const [name, setName] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!signer || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const hash = await registerAgent(signer, name.trim(), metadataURI.trim());
      setTxHash(hash);
      setName("");
      setMetadataURI("");
      onRegistered();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!signer || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const hash = await updateAgentOnChain(signer, name.trim(), metadataURI.trim());
      setTxHash(hash);
      setEditing(false);
      onRegistered();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!agent) {
    return (
      <div className="glow-card rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Register Agent</h2>
        <p className="text-sm text-weavrn-muted mb-4">
          Register your wallet as an agent to access payments, escrow, and incentives.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
          />
          <input
            type="text"
            placeholder="Metadata URI (optional)"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
          />
          <button
            onClick={handleRegister}
            disabled={submitting || !name.trim() || !signer}
            className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            {submitting ? "Registering..." : "Register"}
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {txHash && (
          <p className="mt-3 text-xs text-weavrn-accent">
            Registered!{" "}
            <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="underline">
              View tx
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="glow-card rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold">{agent.name}</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-weavrn-surface border border-weavrn-border text-weavrn-muted">
              #{agent.agentId}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${agent.active ? "bg-weavrn-accent/10 text-weavrn-accent" : "bg-red-500/10 text-red-400"}`}>
              {agent.active ? "Active" : "Inactive"}
            </span>
          </div>
          {agent.metadataURI && (
            <p className="text-xs text-weavrn-muted font-mono truncate max-w-md">{agent.metadataURI}</p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => {
              setName(agent.name);
              setMetadataURI(agent.metadataURI);
              setEditing(true);
            }}
            className="text-xs text-weavrn-muted hover:text-white transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <input
            type="text"
            placeholder="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
          />
          <input
            type="text"
            placeholder="Metadata URI"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            className="w-full px-4 py-2.5 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={submitting || !name.trim() || !signer}
              className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 border border-weavrn-border rounded-lg text-sm text-weavrn-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      {txHash && (
        <p className="mt-3 text-xs text-weavrn-accent">
          Updated!{" "}
          <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="underline">
            View tx
          </a>
        </p>
      )}
    </div>
  );
}
