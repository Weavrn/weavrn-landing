import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

const SOCIAL_MINING_ADDRESS = process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || "";
const WVRN_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_WVRN_TOKEN_ADDRESS || "";
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
