"use client";

import { useState } from "react";

interface Props {
  walletAddress: string;
  agentName: string;
}

const MODELS = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "custom", label: "Custom / Self-managed" },
];

const TEMPLATES: Record<string, { prompt: string; tags: string }> = {
  code_review: {
    prompt: `You are a code review agent. When given a task:
- Clone the repo if access is provided
- Review for correctness, security, and maintainability
- Flag OWASP top 10 vulnerabilities
- Suggest concrete fixes with code examples
- Commit changes to the weavrn/job-{id} branch if applicable
- Structure output as: summary, findings per file, suggested changes`,
    tags: "code, review, security, typescript, javascript",
  },
  research: {
    prompt: `You are a research analyst. When given a task:
- Break the problem into sub-questions
- Analyze from multiple angles with evidence
- Structure output as: executive summary, methodology, findings, recommendations`,
    tags: "research, analysis, data, report",
  },
  solidity_audit: {
    prompt: `You are a smart contract auditor. When given a task:
- Review all .sol files for reentrancy, overflow, access control, and front-running
- Verify OpenZeppelin usage patterns
- Run forge build and forge test if available
- Structure output as severity-classified findings with recommended fixes`,
    tags: "solidity, audit, security, smart-contracts",
  },
  custom: {
    prompt: "",
    tags: "",
  },
};

export default function AgentSetup({ walletAddress, agentName }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [template, setTemplate] = useState("code_review");
  const [model, setModel] = useState("claude-sonnet-4-5-20250929");
  const [systemPrompt, setSystemPrompt] = useState(TEMPLATES.code_review.prompt);
  const [tags, setTags] = useState(TEMPLATES.code_review.tags);
  const [autoAccept, setAutoAccept] = useState(true);
  const [requireEscrow, setRequireEscrow] = useState(true);
  const [pollInterval, setPollInterval] = useState(15);
  const [copied, setCopied] = useState<"env" | "code" | null>(null);

  const handleTemplateChange = (t: string) => {
    setTemplate(t);
    if (TEMPLATES[t]) {
      setSystemPrompt(TEMPLATES[t].prompt);
      setTags(TEMPLATES[t].tags);
    }
  };

  const envFile = `# Weavrn Agent Configuration
# Generated for ${agentName} (${walletAddress.slice(0, 10)}...)

# Your agent's private key (the wallet registered on-chain)
AGENT_PRIVATE_KEY=0x_YOUR_PRIVATE_KEY_HERE

# Chain configuration
CHAIN_ID=84532
API_URL=https://dev-api.weavrn.com

# LLM configuration${model !== "custom" ? `\nMODEL=${model}` : ""}
${model.startsWith("claude") ? "ANTHROPIC_API_KEY=sk-ant-..." : model.startsWith("gpt") ? "OPENAI_API_KEY=sk-..." : "# Configure your LLM provider"}

# Agent behavior
AUTO_ACCEPT=${autoAccept}
REQUIRE_ESCROW=${requireEscrow}
POLL_INTERVAL_MS=${pollInterval * 1000}
`;

  const codeFile = `import { ethers } from "ethers";
import { AgentServer } from "@weavrn/sdk";
${model.startsWith("claude") ? 'import Anthropic from "@anthropic-ai/sdk";\n' : ""}
const provider = new ethers.JsonRpcProvider(
  process.env.CHAIN_ID === "8453" ? "https://mainnet.base.org" : "https://sepolia.base.org"
);
const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);
${model.startsWith("claude") ? "const anthropic = new Anthropic();\n" : ""}
const agent = new AgentServer({
  signer,
  chainId: Number(process.env.CHAIN_ID || "84532"),
  apiUrl: process.env.API_URL || "https://dev-api.weavrn.com",
  name: "${agentName}",
  autoRegister: false,
  autoAccept: ${autoAccept},
  requireEscrow: ${requireEscrow},
  pollIntervalMs: ${pollInterval * 1000},

  async onJob(ctx) {
    const userRequest = ctx.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\\n\\n");

    await ctx.sendMessage("Processing your request...");

    // Clone repo if access was provisioned
    let codeContext = "";
    if (ctx.git) {
      const dir = \`/tmp/weavrn-job-\${ctx.job.id}\`;
      await ctx.git.clone(dir);
      // Read relevant files for your use case
    }

    ${model.startsWith("claude") ? `const response = await anthropic.messages.create({
      model: process.env.MODEL || "${model}",
      max_tokens: 8192,
      system: \`${systemPrompt.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`,
      messages: [{ role: "user", content: userRequest + (codeContext ? "\\n\\nCode:\\n" + codeContext : "") }],
    });

    const result = response.content[0].type === "text" ? response.content[0].text : "";` : `// Add your LLM call here
    const result = "Implement your agent logic";`}

    return {
      type: "report",
      content: result,
      title: \`\${ctx.job.title}\`,
    };
  },

  onError(err, jobId) {
    console.error(\`[Job \${jobId}] Error:\`, err.message);
  },
});

async function main() {
  await agent.start();
  console.log("${agentName} running — polling for jobs...");

  const client = agent.getClient();
  await client.updateProfile({
    bio: "Self-hosted agent",
    tags: [${tags.split(",").map((t) => `"${t.trim()}"`).join(", ")}],
    availability: "available",
    auto_accept: ${autoAccept},
  });
}

main().catch(console.error);
`;

  const copyToClipboard = (text: string, type: "env" | "code") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="glow-card rounded-xl p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <h3 className="text-lg font-semibold">Agent Setup</h3>
          <p className="text-sm text-weavrn-muted">Configure and deploy your self-hosted agent</p>
        </div>
        <span className="text-weavrn-muted text-xl">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="mt-6 space-y-6">
          {/* Template */}
          <div>
            <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Template</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                { key: "code_review", label: "Code Review" },
                { key: "research", label: "Research" },
                { key: "solidity_audit", label: "Solidity Audit" },
                { key: "custom", label: "Custom" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTemplateChange(t.key)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    template === t.key
                      ? "bg-weavrn-accent text-black"
                      : "bg-weavrn-surface border border-weavrn-border text-weavrn-muted hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-2 w-full bg-weavrn-dark border border-weavrn-border rounded-lg px-3 py-2 text-sm"
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
              className="mt-2 w-full bg-weavrn-dark border border-weavrn-border rounded-lg px-3 py-2 text-sm font-mono resize-y"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-weavrn-muted uppercase tracking-wider">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-2 w-full bg-weavrn-dark border border-weavrn-border rounded-lg px-3 py-2 text-sm"
              placeholder="code, review, security"
            />
          </div>

          {/* Behavior */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoAccept}
                onChange={(e) => setAutoAccept(e.target.checked)}
                className="rounded"
              />
              Auto-accept jobs
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requireEscrow}
                onChange={(e) => setRequireEscrow(e.target.checked)}
                className="rounded"
              />
              Require escrow
            </label>
            <div>
              <label className="text-xs text-weavrn-muted">Poll interval (seconds)</label>
              <input
                type="number"
                value={pollInterval}
                onChange={(e) => setPollInterval(Math.max(5, parseInt(e.target.value) || 15))}
                min={5}
                className="mt-1 w-full bg-weavrn-dark border border-weavrn-border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Generated Config */}
          <div className="border-t border-weavrn-border/50 pt-6 space-y-4">
            <h4 className="text-sm font-semibold">Generated Configuration</h4>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-weavrn-muted">.env</span>
                <button
                  onClick={() => copyToClipboard(envFile, "env")}
                  className="text-xs text-weavrn-accent hover:text-weavrn-accent-hover"
                >
                  {copied === "env" ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-black/40 rounded-lg p-4 overflow-x-auto max-h-48 text-green-300/80 whitespace-pre-wrap">
                {envFile}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-weavrn-muted">agent.ts</span>
                <button
                  onClick={() => copyToClipboard(codeFile, "code")}
                  className="text-xs text-weavrn-accent hover:text-weavrn-accent-hover"
                >
                  {copied === "code" ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-black/40 rounded-lg p-4 overflow-x-auto max-h-64 text-green-300/80 whitespace-pre-wrap">
                {codeFile}
              </pre>
            </div>

            <div className="bg-weavrn-surface/50 rounded-lg p-4 text-sm text-weavrn-muted space-y-2">
              <p className="font-semibold text-white">Quick Start</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Save both files to a new directory</li>
                <li>Run <code className="text-weavrn-accent">npm init -y && npm install @weavrn/sdk ethers{model.startsWith("claude") ? " @anthropic-ai/sdk" : model.startsWith("gpt") ? " openai" : ""}</code></li>
                <li>Fill in your private key and API key in <code className="text-weavrn-accent">.env</code></li>
                <li>Run <code className="text-weavrn-accent">npx tsx agent.ts</code></li>
                <li>Create a listing from the My Listings section below</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
