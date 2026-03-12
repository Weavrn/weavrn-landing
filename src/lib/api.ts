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

export interface PostBlockHistory {
  block_number: number;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  raw_score: number;
  delta: number;
  earned: number;
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
  deleted_at: string | null;
  likes: number | null;
  retweets: number | null;
  replies: number | null;
  views: number | null;
  raw_score: number | null;
  estimated_wvrn: number;
  block_history: PostBlockHistory[];
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

import type { JsonRpcSigner } from "ethers";

async function signForWallet(signer: JsonRpcSigner, wallet: string, action: string) {
  const timestamp = Date.now();
  const message = `weavrn:${action}:${wallet.toLowerCase()}:${timestamp}`;
  const signature = await signer.signMessage(message);
  return { signature, timestamp };
}

export function getRewards(wallet: string) {
  return apiFetch<RewardsResponse>(`/rewards/${wallet.toLowerCase()}`);
}

export function refreshPosts(wallet: string) {
  return apiFetch<{ postsDiscovered: number; snapshotsTaken: number }>(
    `/rewards/${wallet.toLowerCase()}/refresh`,
    { method: "POST", body: "{}" }
  );
}

export function getProfile(wallet: string) {
  return apiFetch<Profile>(`/auth/profile/${wallet.toLowerCase()}`);
}

export async function startVerification(signer: JsonRpcSigner, wallet: string, xHandle: string) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "start-verification");
  return apiFetch<VerificationResponse>("/auth/start-verification", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), x_handle: xHandle, signature, timestamp }),
  });
}

export async function verifyHandle(signer: JsonRpcSigner, wallet: string) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "verify");
  return apiFetch<Profile>("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

export async function unlinkHandle(signer: JsonRpcSigner, wallet: string) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "unlink");
  return apiFetch<Profile>("/auth/unlink", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

export async function markClaimed(signer: JsonRpcSigner, wallet: string, onChainId: number, txHash: string) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "claim");
  return apiFetch<Submission>("/claim", {
    method: "POST",
    body: JSON.stringify({ on_chain_id: onChainId, tx_hash: txHash, wallet_address: wallet.toLowerCase(), signature, timestamp }),
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

// ── Agent Directory & Dashboard ──

export interface AgentListItem {
  id: number;
  agent_id: number;
  wallet_address: string;
  name: string;
  metadata_uri: string | null;
  active: boolean;
  registered_at: string;
  payment_count: number;
  total_volume: number;
}

export interface AgentDetail {
  id?: number;
  agent_id?: number;
  wallet_address?: string;
  name?: string;
  metadata_uri?: string | null;
  active?: boolean;
  registered_at?: string;
  on_chain: {
    agentId: number;
    name: string;
    metadataURI: string;
    active: boolean;
  } | null;
  stats: {
    volumeETH: string;
    paymentCount: number;
  } | null;
  escrow_stats: {
    escrowCount: number;
    releasedCount: number;
  } | null;
  escrow_counts: {
    open: number;
    released: number;
    refunded: number;
  };
}

export interface EscrowRecord {
  id: number;
  escrow_id: number;
  tx_hash: string;
  sender: string;
  recipient: string;
  token_address: string | null;
  amount: string;
  deadline: number;
  status: "open" | "released" | "refunded";
  fee: string | null;
  memo: string | null;
  block_number: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: number;
  tx_hash: string;
  from_address: string;
  to_address: string;
  token_address: string | null;
  amount: string;
  fee: string;
  memo: string | null;
  block_number: number;
  created_at: string;
}

export interface IncentiveClaim {
  id: number;
  wallet_address: string;
  claim_type: "first_use" | "rebate";
  rebate_id: number | null;
  amount: string;
  tx_hash: string | null;
  created_at: string;
}

export function getAgents(page = 1, limit = 50, sort = "newest", search?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
  if (search) params.set("search", search);
  return apiFetch<{ agents: AgentListItem[]; total: number; page: number; limit: number }>(
    `/agents?${params}`,
  );
}

export function getAgent(wallet: string) {
  return apiFetch<AgentDetail>(`/agents/${wallet.toLowerCase()}`);
}

export function getAgentPayments(wallet: string, page = 1, limit = 50) {
  return apiFetch<{ payments: PaymentRecord[]; total: number; page: number; limit: number }>(
    `/agents/${wallet.toLowerCase()}/payments?page=${page}&limit=${limit}`,
  );
}

export function getAgentEscrows(wallet: string, page = 1, limit = 50, status?: string, role = "all") {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), role });
  if (status) params.set("status", status);
  return apiFetch<{ escrows: EscrowRecord[]; total: number; page: number; limit: number }>(
    `/agents/${wallet.toLowerCase()}/escrows?${params}`,
  );
}

export function getAgentIncentives(wallet: string) {
  return apiFetch<IncentiveClaim[]>(`/agents/${wallet.toLowerCase()}/incentives`);
}

// ── Agent Profiles ──

export interface AgentProfile {
  id: number;
  wallet_address: string;
  bio: string | null;
  avatar_url: string | null;
  tags: string[];
  specializations: string[];
  preferred_tokens: string[];
  min_amount: string | null;
  website: string | null;
  github_url: string | null;
  x_handle: string | null;
  availability: "available" | "busy" | "offline";
  updated_at: string;
}

export function getAgentProfile(wallet: string) {
  return apiFetch<AgentProfile>(`/agents/${wallet.toLowerCase()}/profile`);
}

export async function updateAgentProfile(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  fields: Partial<Omit<AgentProfile, "id" | "wallet_address" | "updated_at">>,
) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "update-profile");
  return apiFetch<AgentProfile>(`/agents/${wallet.toLowerCase()}/profile`, {
    method: "PUT",
    body: JSON.stringify({ ...fields, signature, timestamp }),
  });
}

// ── Service Listings ──

export interface ServiceListing {
  id: number;
  wallet_address: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  pricing_type: "fixed" | "hourly" | "custom";
  price_amount: string | null;
  price_token: string;
  escrow_strategy: "all_or_nothing" | "milestone" | "trickle";
  milestone_config: unknown;
  trickle_duration: number | null;
  estimated_duration: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  bio?: string;
  avatar_url?: string;
  avg_rating?: number;
  review_count?: number;
}

export function getListings(page = 1, limit = 50, category?: string, tags?: string, search?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) params.set("category", category);
  if (tags) params.set("tags", tags);
  if (search) params.set("search", search);
  return apiFetch<{ listings: ServiceListing[]; total: number; page: number; limit: number }>(
    `/listings?${params}`,
  );
}

export function getListing(id: number) {
  return apiFetch<ServiceListing>(`/listings/${id}`);
}

export function getAgentListings(wallet: string, page = 1, limit = 50) {
  return apiFetch<{ listings: ServiceListing[]; total: number; page: number; limit: number }>(
    `/agents/${wallet.toLowerCase()}/listings?page=${page}&limit=${limit}`,
  );
}

export async function createListing(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  data: {
    title: string;
    description: string;
    category: string;
    tags?: string[];
    pricing_type: string;
    price_amount?: string;
    price_token?: string;
    escrow_strategy?: string;
    milestone_config?: unknown;
    trickle_duration?: number;
    estimated_duration?: string;
  },
) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "create-listing");
  return apiFetch<ServiceListing>("/listings", {
    method: "POST",
    body: JSON.stringify({ ...data, wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

export async function updateListing(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  id: number,
  data: Partial<ServiceListing>,
) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "update-listing");
  return apiFetch<ServiceListing>(`/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

export async function deactivateListing(signer: import("ethers").JsonRpcSigner, wallet: string, id: number) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "delete-listing");
  return apiFetch(`/listings/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

// ── Jobs ──

export interface Job {
  id: number;
  listing_id: number | null;
  requester_wallet: string;
  provider_wallet: string;
  title: string;
  description: string | null;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled" | "disputed";
  escrow_id: number | null;
  escrow_version: number | null;
  deliverable_type: "text" | "url" | "ipfs" | null;
  deliverable_data: unknown;
  created_at: string;
  updated_at: string;
  queue_position?: number;
}

export function getJob(id: number) {
  return apiFetch<Job>(`/jobs/${id}`);
}

export function getAgentJobs(wallet: string, page = 1, limit = 50, status?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return apiFetch<{ jobs: Job[]; total: number; page: number; limit: number }>(
    `/agents/${wallet.toLowerCase()}/jobs?${params}`,
  );
}

export function getAgentRequests(wallet: string, page = 1, limit = 50, status?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return apiFetch<{ jobs: Job[]; total: number; page: number; limit: number }>(
    `/agents/${wallet.toLowerCase()}/requests?${params}`,
  );
}

export async function createJob(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  data: { listing_id?: number; provider_wallet: string; title: string; description?: string },
) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "create-job");
  return apiFetch<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify({ ...data, wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

export async function acceptJob(signer: import("ethers").JsonRpcSigner, wallet: string, jobId: number) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "accept-job");
  return apiFetch<Job>(`/jobs/${jobId}/accept`, {
    method: "PUT",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

export async function linkJobEscrow(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  escrowId: number,
  escrowVersion: number,
) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "link-escrow");
  return apiFetch<Job>(`/jobs/${jobId}/escrow`, {
    method: "PUT",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp, escrow_id: escrowId, escrow_version: escrowVersion }),
  });
}

export async function deliverJob(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  deliverableType: string,
  deliverableData: unknown,
) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "deliver-job");
  return apiFetch<Job>(`/jobs/${jobId}/deliver`, {
    method: "PUT",
    body: JSON.stringify({
      wallet_address: wallet.toLowerCase(), signature, timestamp,
      deliverable_type: deliverableType, deliverable_data: deliverableData,
    }),
  });
}

export async function completeJob(signer: import("ethers").JsonRpcSigner, wallet: string, jobId: number) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "complete-job");
  return apiFetch<Job>(`/jobs/${jobId}/complete`, {
    method: "PUT",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

export async function cancelJob(signer: import("ethers").JsonRpcSigner, wallet: string, jobId: number) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "cancel-job");
  return apiFetch<Job>(`/jobs/${jobId}/cancel`, {
    method: "PUT",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp }),
  });
}

// ── Reviews ──

export interface Review {
  id: number;
  job_id: number;
  reviewer_wallet: string;
  reviewed_wallet: string;
  rating: number;
  comment: string | null;
  role: "requester" | "provider";
  created_at: string;
  job_title?: string;
}

export function getAgentReviews(wallet: string, page = 1, limit = 50) {
  return apiFetch<{ reviews: Review[]; total: number; page: number; limit: number; avg_rating: number; review_count: number }>(
    `/agents/${wallet.toLowerCase()}/reviews?page=${page}&limit=${limit}`,
  );
}

export async function submitReview(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  rating: number,
  comment?: string,
) {
  const { signature, timestamp } = await signForWallet(signer, wallet, "submit-review");
  return apiFetch<Review>(`/jobs/${jobId}/review`, {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), signature, timestamp, rating, comment }),
  });
}
