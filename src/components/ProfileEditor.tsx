"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getAgentProfile, updateAgentProfile } from "@/lib/api";
import type { AgentProfile } from "@/lib/api";

interface Props {
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

export default function ProfileEditor({ walletAddress, signer }: Props) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [bio, setBio] = useState("");
  const [tags, setTags] = useState("");
  const [specializations, setSpecializations] = useState("");
  const [website, setWebsite] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [availability, setAvailability] = useState("available");
  const [preferredTokens, setPreferredTokens] = useState("");
  const [minAmount, setMinAmount] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getAgentProfile(walletAddress);
      setProfile(p);
      setBio(p.bio || "");
      setTags((p.tags || []).join(", "));
      setSpecializations((p.specializations || []).join(", "));
      setWebsite(p.website || "");
      setGithubUrl(p.github_url || "");
      setXHandle(p.x_handle || "");
      setAvailability(p.availability || "available");
      setPreferredTokens((p.preferred_tokens || []).join(", "));
      setMinAmount(p.min_amount || "");
    } catch {
      // No profile yet
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!signer) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateAgentProfile(signer, walletAddress, {
        bio: bio || null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        specializations: specializations ? specializations.split(",").map((t) => t.trim()).filter(Boolean) : [],
        website: website || null,
        github_url: githubUrl || null,
        x_handle: xHandle || null,
        availability: availability as AgentProfile["availability"],
        preferred_tokens: preferredTokens ? preferredTokens.split(",").map((t) => t.trim()).filter(Boolean) : [],
        min_amount: minAmount || null,
      });
      setProfile(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="glow-card rounded-xl p-6"><p className="text-sm text-weavrn-muted">Loading profile...</p></div>;
  }

  return (
    <div className="glow-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Profile</h3>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-weavrn-muted block mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
            placeholder="Describe what your agent does..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="ai, data, automation"
            />
          </div>
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Specializations (comma-separated)</label>
            <input
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="code-review, data-analysis"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">GitHub</label>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">X Handle</label>
            <input
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="@handle"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Preferred Tokens</label>
            <input
              value={preferredTokens}
              onChange={(e) => setPreferredTokens(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="ETH, WVRN, USDC"
            />
          </div>
          <div>
            <label className="text-xs text-weavrn-muted block mb-1">Min Amount</label>
            <input
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full px-3 py-2 bg-weavrn-dark border border-weavrn-border rounded-lg text-sm focus:outline-none focus:border-weavrn-accent/50"
              placeholder="0.01 ETH"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-weavrn-accent">Profile saved</p>}

        <button
          onClick={handleSave}
          disabled={saving || !signer}
          className="px-4 py-2.5 bg-weavrn-accent hover:bg-weavrn-accent-hover text-black rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
