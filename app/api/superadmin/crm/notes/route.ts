import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contact_id");
  const contactType = searchParams.get("contact_type") || "brand";

  if (!contactId) {
    return NextResponse.json({ error: "contact_id required" }, { status: 400 });
  }

  const { data: notes, error } = await auth.supabase
    .from("crm_notes")
    .select("id, content, note_type, followup_date, created_at, author_id")
    .eq("contact_id", contactId)
    .eq("contact_type", contactType)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(notes || []);
}
