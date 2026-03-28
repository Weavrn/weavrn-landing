const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── Session Auth ──

let sessionToken: string | null = null;
let sessionExpiresAt: number | null = null;

export function hasSession() {
  return sessionToken !== null && sessionExpiresAt !== null && Date.now() < sessionExpiresAt;
}

export async function createSession(signer: import("ethers").JsonRpcSigner, walletAddress: string) {
  const timestamp = Date.now();
  const message = `weavrn:session:${walletAddress.toLowerCase()}:${timestamp}`;
  const signature = await signer.signMessage(message);
  const res = await apiFetch<{ token: string; expires_at: string }>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ wallet_address: walletAddress.toLowerCase(), signature, timestamp }),
  });
  sessionToken = res.token;
  sessionExpiresAt = new Date(res.expires_at).getTime();
  return res;
}

export async function clearSession() {
  if (sessionToken) {
    try {
      await apiFetch("/auth/session", { method: "DELETE" });
    } catch {
      // ignore logout errors
    }
  }
  sessionToken = null;
  sessionExpiresAt = null;
}

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
  platform: "x" | "youtube";
  likes: number | null;
  retweets: number | null;
  replies: number | null;
  views: number | null;
  raw_score: number | null;
  estimated_wvrn: number;
  block_history: PostBlockHistory[];
  flagged?: boolean;
  flag_reason?: string | null;
  posted_at?: string | null;
}

export interface BlockReward {
  id: number;
  block_number: number;
  wallet_address: string;
  delta_score: number;
  post_count: number;
  submission_id: number | null;
  reward_amount: string | null;
  merkle_block: boolean;
  claimed: boolean;
  claim_tx_hash: string | null;
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
  x_follower_count: number | null;
  yt_channel_id: string | null;
  yt_handle: string | null;
  yt_verification_code: string | null;
  yt_verification_handle: string | null;
  yt_verification_expires_at: string | null;
  yt_subscriber_count: number | null;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (hasSession()) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    signal: controller.signal,
  });
  clearTimeout(timeout);
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

// Returns auth fields for the request body. With a session token the bearer
// header handles auth so we only need wallet_address. Falls back to per-request
// signature when no session exists.
async function authBody(signer: JsonRpcSigner, wallet: string, action: string) {
  if (hasSession()) {
    return { wallet_address: wallet.toLowerCase() };
  }
  const { signature, timestamp } = await signForWallet(signer, wallet, action);
  return { wallet_address: wallet.toLowerCase(), signature, timestamp };
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
  const auth = await authBody(signer, wallet, "start-verification");
  return apiFetch<VerificationResponse>("/auth/start-verification", {
    method: "POST",
    body: JSON.stringify({ ...auth, x_handle: xHandle }),
  });
}

export async function verifyHandle(signer: JsonRpcSigner, wallet: string) {
  const auth = await authBody(signer, wallet, "verify");
  return apiFetch<Profile>("/auth/verify", {
    method: "POST",
    body: JSON.stringify(auth),
  });
}

export async function unlinkHandle(signer: JsonRpcSigner, wallet: string) {
  const auth = await authBody(signer, wallet, "unlink");
  return apiFetch<Profile>("/auth/unlink", {
    method: "POST",
    body: JSON.stringify(auth),
  });
}

export async function reactivateAgent(signer: JsonRpcSigner, walletOrId: string) {
  const wallet = (await signer.getAddress()).toLowerCase();
  const auth = await authBody(signer, wallet, "reactivate");
  return apiFetch<{ message: string; agent_id: number; tx_hash: string }>(`/agents/${wallet}/reactivate`, {
    method: "POST",
    body: JSON.stringify(auth),
  });
}

export async function markClaimed(signer: JsonRpcSigner, wallet: string, onChainId: number, txHash: string) {
  const auth = await authBody(signer, wallet, "claim");
  return apiFetch<Submission>("/claim", {
    method: "POST",
    body: JSON.stringify({ ...auth, on_chain_id: onChainId, tx_hash: txHash }),
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

export function rerunJob(adminKey: string, jobId: number, reason?: string) {
  return apiFetch<{ message: string; job_id: number }>(`/admin/jobs/${jobId}/rerun`, {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ reason: reason || "Admin rerun" }),
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
  unique_recipients: number;
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
    active: number;
    completed: number;
    refunded: number;
    total_volume?: string;
    released_volume?: string;
  };
  job_counts?: {
    total: number;
    completed: number;
  };
  avg_rating?: number;
  review_count?: number;
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
  strategy: string | null;
  status: "open" | "active" | "completed" | "refunded";
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
  const auth = await authBody(signer, wallet, "update-profile");
  return apiFetch<AgentProfile>(`/agents/${wallet.toLowerCase()}/profile`, {
    method: "PUT",
    body: JSON.stringify({ ...fields, ...auth }),
  });
}

// ── Service Listings ──

export interface InputField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "code" | "url" | "git_url" | "file" | "number";
  required: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
  max_length?: number;
  accept?: string[];
}

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
  escrow_strategy_address: string | null;
  fee_model: "payer" | "provider" | "split";
  milestone_config: unknown;
  trickle_duration: number | null;
  estimated_duration: string | null;
  input_schema: InputField[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  bio?: string;
  avatar_url?: string;
  avg_rating?: number;
  review_count?: number;
}

export function getListings(page = 1, limit = 50, category?: string, tags?: string, search?: string, accepts?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) params.set("category", category);
  if (tags) params.set("tags", tags);
  if (search) params.set("search", search);
  if (accepts) params.set("accepts", accepts);
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
    input_schema?: InputField[];
  },
) {
  const auth = await authBody(signer, wallet, "create-listing");
  return apiFetch<ServiceListing>("/listings", {
    method: "POST",
    body: JSON.stringify({ ...data, ...auth }),
  });
}

export async function updateListing(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  id: number,
  data: Partial<ServiceListing>,
) {
  const auth = await authBody(signer, wallet, "update-listing");
  return apiFetch<ServiceListing>(`/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, ...auth }),
  });
}

export async function deactivateListing(signer: import("ethers").JsonRpcSigner, wallet: string, id: number) {
  const auth = await authBody(signer, wallet, "delete-listing");
  return apiFetch(`/listings/${id}`, {
    method: "DELETE",
    body: JSON.stringify(auth),
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
  status: "pending" | "accepted" | "in_progress" | "awaiting_input" | "delivered" | "completed" | "cancelled" | "disputed";
  escrow_id: number | null;
  deliverable_type: "text" | "code" | "url" | "file" | "report" | "multi" | "ipfs" | null;
  deliverable_data: DeliverableData | null;
  created_at: string;
  updated_at: string;
  queue_position?: number;
}

export interface DeliverableProof {
  files: { path: string; language: string | null; lines: number; size: number }[];
  total_lines: number;
  total_files: number;
  build_success: boolean | null;
  build_log: string | null;
  run_output: string | null;
  run_exit_code: number | null;
  test_output: string | null;
  test_success: boolean | null;
}

export interface DeliverableData {
  content: string | null;
  format?: "markdown" | "plaintext" | "json";
  language?: string | null;
  title?: string;
  type?: string;
  proof?: DeliverableProof | null;
  sections?: { heading: string; content: string }[];
  attachments?: { name: string; type: string; url: string }[];
}

export interface JobMessage {
  id: number;
  job_id: number;
  sender_wallet: string;
  role: "user" | "agent" | "system";
  content: string;
  content_type: "text" | "code" | "url" | "file_ref";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentCapability {
  id: number;
  wallet_address: string;
  capability_type: "model" | "framework" | "input_type" | "output_type" | "language" | "tool";
  value: string;
  metadata: Record<string, unknown>;
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
  data: { listing_id?: number; provider_wallet: string; title: string; description?: string; initial_message?: string; input_data?: Record<string, unknown> },
) {
  const auth = await authBody(signer, wallet, "create-job");
  return apiFetch<Job>("/jobs", {
    method: "POST",
    body: JSON.stringify({ ...data, ...auth }),
  });
}

export async function acceptJob(signer: import("ethers").JsonRpcSigner, wallet: string, jobId: number) {
  const auth = await authBody(signer, wallet, "accept-job");
  return apiFetch<Job>(`/jobs/${jobId}/accept`, {
    method: "PUT",
    body: JSON.stringify(auth),
  });
}

export async function linkJobEscrow(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  escrowId: number,
) {
  const auth = await authBody(signer, wallet, "link-escrow");
  return apiFetch<Job>(`/jobs/${jobId}/escrow`, {
    method: "PUT",
    body: JSON.stringify({ ...auth, escrow_id: escrowId }),
  });
}

export async function deliverJob(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  deliverableType: string,
  deliverableData: unknown,
) {
  const auth = await authBody(signer, wallet, "deliver-job");
  return apiFetch<Job>(`/jobs/${jobId}/deliver`, {
    method: "PUT",
    body: JSON.stringify({
      ...auth,
      deliverable_type: deliverableType, deliverable_data: deliverableData,
    }),
  });
}

export async function completeJob(signer: import("ethers").JsonRpcSigner, wallet: string, jobId: number) {
  const auth = await authBody(signer, wallet, "complete-job");
  return apiFetch<Job>(`/jobs/${jobId}/complete`, {
    method: "PUT",
    body: JSON.stringify(auth),
  });
}

export async function completeJobWithAuth(signer: import("ethers").JsonRpcSigner, wallet: string, jobId: number): Promise<Job | null> {
  // Sign once, retry the API call without re-signing (avoids multiple MetaMask popups)
  const auth = await authBody(signer, wallet, "complete-job");
  const body = JSON.stringify(auth);
  for (let i = 0; i < 8; i++) {
    try {
      return await apiFetch<Job>(`/jobs/${jobId}/complete`, { method: "PUT", body });
    } catch {
      if (i === 7) return null;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  return null;
}

export async function cancelJob(signer: import("ethers").JsonRpcSigner, wallet: string, jobId: number) {
  const auth = await authBody(signer, wallet, "cancel-job");
  return apiFetch<Job>(`/jobs/${jobId}/cancel`, {
    method: "PUT",
    body: JSON.stringify(auth),
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

export async function disputeJob(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  reason: string,
) {
  const auth = await authBody(signer, wallet, "dispute-job");
  return apiFetch(`/jobs/${jobId}/dispute`, {
    method: "PUT",
    body: JSON.stringify({ ...auth, reason }),
  });
}

// Admin disputes
export interface Dispute {
  id: number;
  job_id: number;
  reporter_wallet: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  admin_notes: string | null;
  resolution: "completed" | "cancelled" | null;
  created_at: string;
  resolved_at: string | null;
  job_title?: string;
  requester_wallet?: string;
  provider_wallet?: string;
}

export function getAdminDisputes(adminKey: string, status = "open") {
  return apiFetch<Dispute[]>(`/admin/disputes?status=${status}`, {
    headers: adminHeaders(adminKey),
  });
}

export function resolveDispute(adminKey: string, disputeId: number, resolution: "completed" | "cancelled", adminNotes?: string) {
  return apiFetch<Dispute>(`/admin/disputes/${disputeId}/resolve`, {
    method: "PUT",
    headers: { ...adminHeaders(adminKey), "Content-Type": "application/json" },
    body: JSON.stringify({ resolution, admin_notes: adminNotes }),
  });
}

export async function submitReview(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  rating: number,
  comment?: string,
) {
  const auth = await authBody(signer, wallet, "submit-review");
  return apiFetch<Review>(`/jobs/${jobId}/review`, {
    method: "POST",
    body: JSON.stringify({ ...auth, rating, comment }),
  });
}

// ── Job Messages ──

export async function sendJobMessage(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  content: string,
  contentType = "text",
) {
  const auth = await authBody(signer, wallet, "send-message");
  return apiFetch<JobMessage>(`/jobs/${jobId}/message`, {
    method: "POST",
    body: JSON.stringify({ ...auth, content, content_type: contentType }),
  });
}

export function getJobMessages(wallet: string, jobId: number) {
  return apiFetch<{ messages: JobMessage[] }>(`/jobs/${jobId}/messages?wallet_address=${wallet.toLowerCase()}`);
}

// ── Extended Agent Search ──

export function getAgentsFiltered(
  page = 1,
  limit = 50,
  sort = "newest",
  search?: string,
  inputType?: string,
  model?: string,
  capability?: string,
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
  if (search) params.set("search", search);
  if (inputType) params.set("input_type", inputType);
  if (model) params.set("model", model);
  if (capability) params.set("capability", capability);
  return apiFetch<{ agents: AgentListItem[]; total: number; page: number; limit: number }>(
    `/agents?${params}`,
  );
}

// ── File Uploads ──

export async function uploadJobFile(
  signer: import("ethers").JsonRpcSigner,
  wallet: string,
  jobId: number,
  file: File,
) {
  const form = new FormData();
  form.append("file", file);
  form.append("wallet_address", wallet.toLowerCase());

  const headers: Record<string, string> = {};
  if (hasSession()) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  } else {
    const { signature, timestamp } = await signForWallet(signer, wallet, "upload-file");
    form.append("signature", signature);
    form.append("timestamp", String(timestamp));
  }

  const res = await fetch(`${API_URL}/jobs/${jobId}/upload`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || res.statusText);
  }
  return res.json() as Promise<JobMessage>;
}

export function getJobFileUrl(jobId: number, storedName: string, wallet: string) {
  return `${API_URL}/jobs/${jobId}/files/${encodeURIComponent(storedName)}?wallet_address=${wallet.toLowerCase()}`;
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  wallet_address: string;
  x_handle: string | null;
  yt_handle: string | null;
  delta_score: number;
  total_delta?: number;
  post_count: number;
  reward_amount?: string;
  total_earned?: string;
}

export interface LeaderboardResponse {
  block: number | "alltime";
  leaderboard: LeaderboardEntry[];
}

export function getLeaderboard(block?: number | "alltime", limit = 20) {
  const params = new URLSearchParams();
  if (block != null) params.set("block", String(block));
  if (limit !== 20) params.set("limit", String(limit));
  return apiFetch<LeaderboardResponse>(`/rewards/leaderboard?${params}`);
}

// ── Earnings History ──

export interface EarningsBlock {
  block_number: number;
  delta_score: number;
  post_count: number;
  reward_amount: string | null;
}

export function getEarningsHistory(wallet: string, blocks = 20) {
  return apiFetch<{ wallet: string; blocks: EarningsBlock[] }>(
    `/rewards/${wallet.toLowerCase()}/history?blocks=${blocks}`
  );
}

// ── Mining Stats ──

export interface MiningStatsResponse {
  current_block: number;
  current_emission: string;
  total_miners: number;
  total_blocks_settled: number;
  total_wvrn_distributed: string;
  active_miners_this_block: number;
  rules: {
    min_engagement_score: number;
    min_x_followers: number;
    min_yt_subscribers: number;
  };
}

export function getMiningStats() {
  return apiFetch<MiningStatsResponse>("/rewards/stats");
}

// ── YouTube Verification ──

export async function startYouTubeVerification(signer: import("ethers").JsonRpcSigner, wallet: string, ytHandle: string) {
  const auth = await authBody(signer, wallet, "start-yt-verification");
  return apiFetch<VerificationResponse>("/auth/start-yt-verification", {
    method: "POST",
    body: JSON.stringify({ ...auth, yt_handle: ytHandle }),
  });
}

export async function verifyYouTubeHandle(signer: import("ethers").JsonRpcSigner, wallet: string) {
  const auth = await authBody(signer, wallet, "verify-yt");
  return apiFetch<Profile>("/auth/verify-yt", {
    method: "POST",
    body: JSON.stringify(auth),
  });
}

export async function unlinkYouTubeHandle(signer: import("ethers").JsonRpcSigner, wallet: string) {
  const auth = await authBody(signer, wallet, "unlink-yt");
  return apiFetch<Profile>("/auth/unlink-yt", {
    method: "POST",
    body: JSON.stringify(auth),
  });
}

// Mock provider admin

export interface MockUser {
  id: string;
  username: string;
  bio: string;
  followersCount: number;
}

export interface MockTweet {
  id: string;
  text: string;
  authorUsername: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
}

export interface MockVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

export interface MockChannel {
  id: string;
  title: string;
  handle: string;
  customUrl: string;
  description: string;
  subscriberCount: number;
}

export function createMockUser(adminKey: string, user: MockUser) {
  return apiFetch<MockUser>("/admin/mock/users", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(user),
  });
}

export function createMockChannel(adminKey: string, channel: MockChannel) {
  return apiFetch<MockChannel>("/admin/mock/channels", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(channel),
  });
}

export function getMockUsers(adminKey: string) {
  return apiFetch<MockUser[]>("/admin/mock/users", { headers: adminHeaders(adminKey) });
}

export function updateMockUserBio(adminKey: string, username: string, bio: string) {
  return apiFetch<MockUser>(`/admin/mock/users/${username}/bio`, {
    method: "PUT",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ bio }),
  });
}

export function getMockTweets(adminKey: string) {
  return apiFetch<MockTweet[]>("/admin/mock/tweets", { headers: adminHeaders(adminKey) });
}

export function updateMockTweetMetrics(adminKey: string, id: string, metrics: Partial<Pick<MockTweet, "likes" | "retweets" | "replies" | "views">>) {
  return apiFetch<MockTweet>(`/admin/mock/tweets/${id}/metrics`, {
    method: "PUT",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(metrics),
  });
}

export function getMockChannels(adminKey: string) {
  return apiFetch<MockChannel[]>("/admin/mock/channels", { headers: adminHeaders(adminKey) });
}

export function updateMockChannelDescription(adminKey: string, id: string, description: string) {
  return apiFetch<MockChannel>(`/admin/mock/channels/${id}/description`, {
    method: "PUT",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ description }),
  });
}

export function getMockVideos(adminKey: string) {
  return apiFetch<MockVideo[]>("/admin/mock/videos", { headers: adminHeaders(adminKey) });
}

export function updateMockVideoMetrics(adminKey: string, id: string, metrics: Partial<Pick<MockVideo, "views" | "likes" | "comments">>) {
  return apiFetch<MockVideo>(`/admin/mock/videos/${id}/metrics`, {
    method: "PUT",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(metrics),
  });
}

export function resetMockData(adminKey: string) {
  return apiFetch<{ ok: boolean }>("/admin/mock/reset", {
    method: "POST",
    headers: adminHeaders(adminKey),
  });
}

export function bulkUpdateMockMetrics(adminKey: string, tweetDelta?: Partial<Pick<MockTweet, "likes" | "retweets" | "replies" | "views">>, videoDelta?: Partial<Pick<MockVideo, "views" | "likes" | "comments">>) {
  return apiFetch<{ ok: boolean }>("/admin/mock/bulk-update-metrics", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ tweetDelta, videoDelta }),
  });
}

export interface LinkedHandle {
  wallet_address: string;
  x_handle: string | null;
  yt_handle: string | null;
}

export function getLinkedHandles(adminKey: string) {
  return apiFetch<LinkedHandle[]>("/admin/linked-handles", { headers: adminHeaders(adminKey) });
}

export function linkHandle(adminKey: string, wallet: string, x_handle: string) {
  return apiFetch("/admin/link-handle", {
    method: "PUT",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ wallet, x_handle }),
  });
}

export function createMockTweet(adminKey: string, tweet: MockTweet) {
  return apiFetch<MockTweet>("/admin/mock/tweets", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(tweet),
  });
}

export function createMockVideo(adminKey: string, video: MockVideo) {
  return apiFetch<MockVideo>("/admin/mock/videos", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(video),
  });
}

export interface MockAutoIncrement {
  enabled: boolean;
  tweets: { likes: number; retweets: number; replies: number; views: number };
  videos: { views: number; likes: number; comments: number };
}

export function getMockAutoIncrement(adminKey: string) {
  return apiFetch<MockAutoIncrement>("/admin/mock/auto-increment", { headers: adminHeaders(adminKey) });
}

export function setMockAutoIncrement(adminKey: string, config: Partial<MockAutoIncrement>) {
  return apiFetch<MockAutoIncrement>("/admin/mock/auto-increment", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify(config),
  });
}

// Merkle rewards

export interface MerkleProofResponse {
  block_number: number;
  wallet: string;
  amount: string;
  proof: string[];
  merkle_root: string;
}

export function getMerkleProof(wallet: string, blockNumber: number) {
  return apiFetch<MerkleProofResponse>(`/rewards/${wallet.toLowerCase()}/proof/${blockNumber}`);
}

export async function markMerkleClaimed(signer: import("ethers").JsonRpcSigner, wallet: string, blockNumber: number, txHash: string) {
  const auth = await authBody(signer, wallet, "claim-merkle");
  return apiFetch(`/claim/merkle`, {
    method: "POST",
    body: JSON.stringify({ block_number: blockNumber, tx_hash: txHash, ...auth }),
  });
}
