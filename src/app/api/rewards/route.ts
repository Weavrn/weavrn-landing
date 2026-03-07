import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { error: "Missing wallet parameter" },
      { status: 400 }
    );
  }

  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("wallet_address", wallet)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ submissions: submissions ?? [] });
}
