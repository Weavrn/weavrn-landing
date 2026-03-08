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

export interface RewardsResponse {
  wallet: string;
  balance: string;
  total_earned: string;
  submissions: Submission[];
}

export interface Profile {
  wallet_address: string;
  x_handle: string | null;
  created_at: string;
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

export function linkXHandle(wallet: string, xHandle: string) {
  return apiFetch<Profile>("/auth/link", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), x_handle: xHandle }),
  });
}

export function submitPost(wallet: string, postUrl: string) {
  return apiFetch<Submission>("/submit", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet.toLowerCase(), post_url: postUrl }),
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

export function getAdminSubmissions(adminKey: string) {
  return apiFetch<(Submission & { x_handle: string | null })[]>(
    "/admin/submissions",
    { headers: adminHeaders(adminKey) },
  );
}

export function approveSubmission(
  adminKey: string,
  submissionId: number,
  manualScore?: number,
) {
  return apiFetch<Submission>("/admin/approve", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({
      submission_id: submissionId,
      ...(manualScore !== undefined && { manual_score: manualScore }),
    }),
  });
}

export function rejectSubmission(adminKey: string, submissionId: number) {
  return apiFetch<Submission>("/admin/reject", {
    method: "POST",
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ submission_id: submissionId }),
  });
}
