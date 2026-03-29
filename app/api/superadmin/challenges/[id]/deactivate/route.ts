import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  // Check if challenge has ended — mark as completed instead of draft
  const { data: challenge } = await supabase
    .from("challenges")
    .select("end_date")
    .eq("id", params.id)
    .single();

  const newStatus = challenge && new Date(challenge.end_date) < new Date() ? "completed" : "draft";

  const { error } = await supabase
    .from("challenges")
    .update({ status: newStatus })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, status: newStatus });
}
