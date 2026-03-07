import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants";

let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return (_supabase as any)[prop];
  },
});

export interface Submission {
  id: string;
  wallet_address: string;
  x_handle: string;
  post_url: string;
  status: "pending" | "approved" | "rejected";
  engagement_score: number | null;
  reward_amount: number | null;
  claimed: boolean;
  created_at: string;
}

export interface UserProfile {
  wallet_address: string;
  x_handle: string | null;
  total_earned: number;
  created_at: string;
}
