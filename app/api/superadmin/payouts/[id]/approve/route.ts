import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validatePayout } from "@/lib/payout-safety";

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

  const validation = await validatePayout(params.id);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Balance already debited at request time — just mark as sent
  const { error } = await supabase
    .from("payouts")
    .update({ status: "sent", completed_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: "Failed to process payout" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
