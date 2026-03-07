import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallet_address, x_handle } = body;

  if (!wallet_address || !x_handle) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Upsert user profile
  const { error } = await supabase.from("profiles").upsert(
    {
      wallet_address,
      x_handle,
    },
    { onConflict: "wallet_address" }
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to link account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
