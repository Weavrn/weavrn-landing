import { BrowserProvider, Contract, JsonRpcSigner, JsonRpcProvider } from "ethers";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

const SOCIAL_MINING_ADDRESS = process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || "";
const WVRN_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_WVRN_TOKEN_ADDRESS || "";
const AGENT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || "";
const PAYMENT_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS || "";
const ESCROW_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ROUTER_ADDRESS || "";
const USAGE_INCENTIVES_ADDRESS = process.env.NEXT_PUBLIC_USAGE_INCENTIVES_ADDRESS || "";
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "84532";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";

const CHAIN_CONFIGS: Record<string, { name: string; rpc: string; explorer: string }> = {
  "84532": {
    name: "Base Sepolia",
    rpc: RPC_URL || "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
  },
  "8453": {
    name: "Base",
    rpc: RPC_URL || "https://mainnet.base.org",
    explorer: "https://basescan.org",
  },
};

const SOCIAL_MINING_ABI = [
  {
    inputs: [{ name: "submissionId", type: "uint256" }],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "submissionIds", type: "uint256[]" }],
    name: "batchClaimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "submissions",
    outputs: [
      { name: "submitter", type: "address" },
      { name: "blockNumber", type: "uint256" },
      { name: "engagementScore", type: "uint256" },
      { name: "effectiveScore", type: "uint256" },
      { name: "rewardAmount", type: "uint256" },
      { name: "claimed", type: "bool" },
      { name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentEmission",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentBlockNumber",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "blockNumber", type: "uint256" }],
    name: "getBlockBounds",
    outputs: [
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBlockEmission",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

export function getChainConfig() {
  return CHAIN_CONFIGS[CHAIN_ID] || CHAIN_CONFIGS["84532"];
}

export function getExplorerTxUrl(txHash: string) {
  return `${getChainConfig().explorer}/tx/${txHash}`;
}

export function getTargetChainIdHex() {
  return "0x" + parseInt(CHAIN_ID).toString(16);
}

export async function getProviderAndSigner(): Promise<{
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
}> {
  if (!window.ethereum) throw new Error("No wallet found");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

export async function checkAndSwitchChain(): Promise<boolean> {
  if (!window.ethereum) return false;
  const targetHex = getTargetChainIdHex();

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
    return true;
  } catch (err: unknown) {
    const switchErr = err as { code?: number };
    if (switchErr.code === 4902) {
      const config = getChainConfig();
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: targetHex,
            chainName: config.name,
            rpcUrls: [config.rpc],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: [config.explorer],
          },
        ],
      });
      return true;
    }
    return false;
  }
}

export async function claimReward(
  signer: JsonRpcSigner,
  onChainId: number,
): Promise<string> {
  const contract = new Contract(SOCIAL_MINING_ADDRESS, SOCIAL_MINING_ABI, signer);
  const tx = await contract.claimReward(onChainId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function batchClaimRewards(
  signer: JsonRpcSigner,
  onChainIds: number[],
): Promise<string> {
  const contract = new Contract(SOCIAL_MINING_ADDRESS, SOCIAL_MINING_ABI, signer);
  const tx = await contract.batchClaimRewards(onChainIds);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function addTokenToWallet(): Promise<boolean> {
  if (!window.ethereum) return false;
  try {
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: WVRN_TOKEN_ADDRESS,
          symbol: "WVRN",
          decimals: 18,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ── Agent Registry ──

const AGENT_REGISTRY_ABI = [
  {
    inputs: [{ name: "addr", type: "address" }],
    name: "getAgent",
    outputs: [
      { name: "agentId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "addr", type: "address" }],
    name: "isRegistered",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAgents",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "metadataURI", type: "string" },
    ],
    name: "registerAgent",
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "metadataURI", type: "string" },
    ],
    name: "updateAgent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ── Payment Router ──

const PAYMENT_ROUTER_ABI = [
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "agentVolumeETH",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "agentPaymentCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "agentReceivedETH",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "agentReceivedCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "agentUniqueRecipients",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// ── Escrow Router ──

const ESCROW_ROUTER_ABI = [
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "agentEscrowCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "agentReleasedCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "release",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "claimStream",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "refund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ── Strategy ABIs ──

const MILESTONE_STRATEGY_ABI = [
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "getMilestones",
    outputs: [{ name: "", type: "uint16[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "getCurrentMilestone",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const TRICKLE_STRATEGY_ABI = [
  {
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "totalAmount", type: "uint256" },
      { name: "alreadyReleased", type: "uint256" },
    ],
    name: "getClaimable",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "getConfig",
    outputs: [
      { name: "startTime", type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const ESCROW_ROUTER_GETESCROW_ABI = [
  {
    inputs: [{ name: "escrowId", type: "uint256" }],
    name: "getEscrow",
    outputs: [
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "strategy", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "released", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Known strategy addresses (Base Sepolia)
const STRATEGY_ADDRESSES: Record<string, string> = {
  "0xe0a77e8dd41945991a2f1454517b86e30b04be56": "all_or_nothing",
  "0x8f744571abd15d53cbb373fb973fd060775d62e9": "milestone",
  "0x31c8fdd969e70a2a4afe1f15d187a702b9d0465e": "trickle",
};

export function getStrategyType(strategyAddress: string | null): "all_or_nothing" | "milestone" | "trickle" | "unknown" {
  if (!strategyAddress) return "unknown";
  return (STRATEGY_ADDRESSES[strategyAddress.toLowerCase()] || "unknown") as "all_or_nothing" | "milestone" | "trickle" | "unknown";
}

function getReadProvider() {
  const config = getChainConfig();
  return new JsonRpcProvider(config.rpc);
}

export interface MilestoneInfo {
  milestones: number[];
  currentMilestone: number;
}

export async function getMilestoneInfo(escrowId: number, strategyAddress: string): Promise<MilestoneInfo> {
  const provider = getReadProvider();
  const contract = new Contract(strategyAddress, MILESTONE_STRATEGY_ABI, provider);
  const [milestones, currentMilestone] = await Promise.all([
    contract.getMilestones(escrowId),
    contract.getCurrentMilestone(escrowId),
  ]);
  return {
    milestones: milestones.map((m: bigint) => Number(m)),
    currentMilestone: Number(currentMilestone),
  };
}

export interface TrickleInfo {
  startTime: number;
  duration: number;
  claimable: string;
}

export async function getTrickleInfo(escrowId: number, strategyAddress: string): Promise<TrickleInfo> {
  const { formatEther } = await import("ethers");
  const provider = getReadProvider();
  const strategy = new Contract(strategyAddress, TRICKLE_STRATEGY_ABI, provider);
  const escrowContract = new Contract(ESCROW_ROUTER_ADDRESS, ESCROW_ROUTER_GETESCROW_ABI, provider);
  const [, , , , totalAmount, released] = await escrowContract.getEscrow(escrowId);
  const [config, claimable] = await Promise.all([
    strategy.getConfig(escrowId),
    strategy.getClaimable(escrowId, totalAmount, released),
  ]);
  return {
    startTime: Number(config.startTime),
    duration: Number(config.duration),
    claimable: formatEther(claimable),
  };
}

// ── Usage Incentives ──

const USAGE_INCENTIVES_ABI = [
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "hasClaimedFirstUse",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claimFirstUseBonus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "rebateId", type: "uint256" }],
    name: "claimRebate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ── Contract helpers ──

export async function getAgentOnChain(address: string): Promise<{
  agentId: number;
  name: string;
  metadataURI: string;
  active: boolean;
  isRegistered: boolean;
} | null> {
  if (!AGENT_REGISTRY_ADDRESS) return null;
  const { provider } = await getProviderAndSigner();
  const contract = new Contract(AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, provider);
  const registered = await contract.isRegistered(address);
  if (!registered) return null;
  const [agentId, name, metadataURI, active] = await contract.getAgent(address);
  return { agentId: Number(agentId), name, metadataURI, active, isRegistered: true };
}

export async function getAgentStats(address: string): Promise<{
  volumeETH: string;
  paymentCount: number;
  receivedETH: string;
  receivedCount: number;
  uniqueRecipients: number;
  escrowCount: number;
  releasedCount: number;
}> {
  const { formatEther } = await import("ethers");
  const { provider } = await getProviderAndSigner();
  const router = new Contract(PAYMENT_ROUTER_ADDRESS, PAYMENT_ROUTER_ABI, provider);
  const escrow = ESCROW_ROUTER_ADDRESS
    ? new Contract(ESCROW_ROUTER_ADDRESS, ESCROW_ROUTER_ABI, provider)
    : null;

  const [volETH, payCount, recvETH, recvCount, uniqueRecips] = await Promise.all([
    router.agentVolumeETH(address),
    router.agentPaymentCount(address),
    router.agentReceivedETH(address),
    router.agentReceivedCount(address),
    router.agentUniqueRecipients(address),
  ]);

  let escrowCount = 0;
  let releasedCount = 0;
  if (escrow) {
    const [ec, rc] = await Promise.all([
      escrow.agentEscrowCount(address),
      escrow.agentReleasedCount(address),
    ]);
    escrowCount = Number(ec);
    releasedCount = Number(rc);
  }

  return {
    volumeETH: formatEther(volETH),
    paymentCount: Number(payCount),
    receivedETH: formatEther(recvETH),
    receivedCount: Number(recvCount),
    uniqueRecipients: Number(uniqueRecips),
    escrowCount,
    releasedCount,
  };
}

export async function getFirstUseStatus(address: string): Promise<boolean> {
  if (!USAGE_INCENTIVES_ADDRESS) return false;
  const { provider } = await getProviderAndSigner();
  const contract = new Contract(USAGE_INCENTIVES_ADDRESS, USAGE_INCENTIVES_ABI, provider);
  return contract.hasClaimedFirstUse(address);
}

export async function registerAgent(
  signer: JsonRpcSigner,
  name: string,
  metadataURI: string,
): Promise<string> {
  const contract = new Contract(AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, signer);
  const tx = await contract.registerAgent(name, metadataURI);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function updateAgentOnChain(
  signer: JsonRpcSigner,
  name: string,
  metadataURI: string,
): Promise<string> {
  const contract = new Contract(AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, signer);
  const tx = await contract.updateAgent(name, metadataURI);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function claimFirstUseBonus(signer: JsonRpcSigner): Promise<string> {
  const contract = new Contract(USAGE_INCENTIVES_ADDRESS, USAGE_INCENTIVES_ABI, signer);
  const tx = await contract.claimFirstUseBonus();
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function claimRebateOnChain(signer: JsonRpcSigner, rebateId: number): Promise<string> {
  const contract = new Contract(USAGE_INCENTIVES_ADDRESS, USAGE_INCENTIVES_ABI, signer);
  const tx = await contract.claimRebate(rebateId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function releaseEscrow(signer: JsonRpcSigner, escrowId: number): Promise<string> {
  const contract = new Contract(ESCROW_ROUTER_ADDRESS, ESCROW_ROUTER_ABI, signer);
  const tx = await contract.release(escrowId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function claimStream(signer: JsonRpcSigner, escrowId: number): Promise<string> {
  const contract = new Contract(ESCROW_ROUTER_ADDRESS, ESCROW_ROUTER_ABI, signer);
  const tx = await contract.claimStream(escrowId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function refundEscrow(signer: JsonRpcSigner, escrowId: number): Promise<string> {
  const contract = new Contract(ESCROW_ROUTER_ADDRESS, ESCROW_ROUTER_ABI, signer);
  const tx = await contract.refund(escrowId);
  const receipt = await tx.wait();
  return receipt.hash;
}
