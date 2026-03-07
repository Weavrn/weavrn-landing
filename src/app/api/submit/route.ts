import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTweetId } from "@/lib/twitter";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallet_address, x_handle, post_url } = body;

  if (!wallet_address || !x_handle || !post_url) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!extractTweetId(post_url)) {
    return NextResponse.json(
      { error: "Invalid X/Twitter post URL" },
      { status: 400 }
    );
  }

  // Check for duplicate URL
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("post_url", post_url)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "This post has already been submitted" },
      { status: 409 }
    );
  }

  // Rate limit: max 3 submissions per day per wallet
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("wallet_address", wallet_address)
    .gte("created_at", today.toISOString());

  if (count !== null && count >= 3) {
    return NextResponse.json(
      { error: "Daily submission limit reached (3/day)" },
      { status: 429 }
    );
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      wallet_address,
      x_handle,
      post_url,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }

  return NextResponse.json({ submission: data });
}
