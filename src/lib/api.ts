const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface Submission {
  id: number;
  wallet_address: string;
  post_url: string;
  status: "pending" | "approved" | "rejected" | "claimed";
  engagement_score: number | null;
  reward_amount: string | null;
  on_chain_id: number | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedPost {
  id: number;
  tweet_id: string;
  wallet_address: string;
  x_handle: string;
  post_url: string;
  text: string | null;
  discovered_in_block: number;
  first_seen_at: string;
  deactivated: boolean;
}

export interface BlockReward {
  id: number;
  block_number: number;
  wallet_address: string;
  delta_score: number;
  post_count: number;
  submission_id: number | null;
  created_at: string;
}

export interface CurrentBlock {
  number: number;
  start_time: number;
  end_time: number;
}

export interface RewardsResponse {
  wallet: string;
  balance: string;
  total_earned: string;
  current_block: CurrentBlock;
  tracked_posts: TrackedPost[];
  block_rewards: BlockReward[];
  submissions: Submission[];
}

export interface Profile {
  wallet_address: string;
  x_handle: string | null;
  verification_code: string | null;
  verification_handle: string | null;
  verification_expires_at: string | null;
  created_at: string;
}

export interface VerificationResponse {
  code: string;
  expires_at: string;
}

export interface BlockStats {
  current_block: {
    number: number;
    start_time: number;
    end_time: number;
    emission: string;
  };
  settled_blocks: {
    block_number: number;
    user_count: number;
    total_score: number;
  }[];
}

export interface BlockDetail {
  block_number: number;
  start_time: number;
  end_time: number;
  rewards: BlockReward[];
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || body.error || res.statusText;
    throw new Error(msg);
  }
  return res.json();
}

export function getRewards(wallet: string) {
  return apiFetch<RewardsResponse>(`/rewards/${wallet.toLowerCase()}`);
}

export function getProfile(wallet: string) {
  return apiFetch<Profile>(`/auth/profile/${wallet.toLowerCase()}`);
}

export function startVerification(wallet: string, xHandle: string) {
  return apiFetch<VerificationResponse>("/auth/start-verification", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), x_handle: xHandle }),
  });
}

export function verifyHandle(wallet: string) {
  return apiFetch<Profile>("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase() }),
  });
}

export function unlinkHandle(wallet: string) {
  return apiFetch<Profile>("/auth/unlink", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase() }),
  });
}

export function markClaimed(onChainId: number, txHash: string) {
  return apiFetch<Submission>("/claim", {
    method: "POST",
    body: JSON.stringify({ on_chain_id: onChainId, tx_hash: txHash }),
  });
}

// Admin endpoints

function adminHeaders(adminKey: string) {
  return { "x-admin-key": adminKey };
}

export function getAdminBlocks(adminKey: string) {
  return apiFetch<BlockStats>("/admin/blocks", {
    headers: adminHeaders(adminKey),
  });
}

export function getAdminBlockDetail(adminKey: string, blockNumber: number) {
  return apiFetch<BlockDetail>(`/admin/blocks/${blockNumber}`, {
    headers: adminHeaders(adminKey),
  });
}

export function getAdminPosts(adminKey: string) {
  return apiFetch<TrackedPost[]>("/admin/posts", {
    headers: adminHeaders(adminKey),
  });
}

export function deactivatePost(adminKey: string, postId: number) {
  return apiFetch<TrackedPost>(`/admin/posts/${postId}/deactivate`, {
    method: "POST",
    headers: adminHeaders(adminKey),
  });
}

export function activatePost(adminKey: string, postId: number) {
  return apiFetch<TrackedPost>(`/admin/posts/${postId}/activate`, {
    method: "POST",
    headers: adminHeaders(adminKey),
  });
}

export function settleBlock(adminKey: string, blockNumber: number) {
  return apiFetch("/admin/blocks/" + blockNumber + "/settle", {
    method: "POST",
    headers: adminHeaders(adminKey),
  });
}
