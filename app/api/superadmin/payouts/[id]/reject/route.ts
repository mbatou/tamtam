import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();

  try {
    await supabase.rpc("process_payout", {
      p_payout_id: params.id,
      p_status: "failed",
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to process payout" }, { status: 500 });
  }
}
