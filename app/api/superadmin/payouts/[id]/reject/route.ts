import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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
