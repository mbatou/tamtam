import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Fetch all tickets with user info
  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("*, users:user_id(name, role, phone)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count stats
  const all = tickets || [];
  const open = all.filter((t) => t.status === "open").length;
  const replied = all.filter((t) => t.status === "replied").length;
  const closed = all.filter((t) => t.status === "closed").length;

  return NextResponse.json({ tickets: all, stats: { total: all.length, open, replied, closed } });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { ticket_id, action, reply } = body;

  if (!ticket_id || !action) {
    return NextResponse.json({ error: "ticket_id et action requis" }, { status: 400 });
  }

  // Get current ticket
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticket_id)
    .single();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  if (action === "reply") {
    if (!reply || reply.trim().length === 0) {
      return NextResponse.json({ error: "Réponse requise" }, { status: 400 });
    }

    const { error } = await supabase
      .from("support_tickets")
      .update({
        admin_reply: reply,
        status: "replied",
        replied_by: session.user.id,
        replied_at: new Date().toISOString(),
      })
      .eq("id", ticket_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "support_reply",
        target_type: "support_ticket",
        target_id: ticket_id,
        details: { subject: ticket.subject },
      });
    } catch { /* admin_activity_log may not exist yet */ }

    return NextResponse.json({ success: true });
  }

  if (action === "close") {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "closed" })
      .eq("id", ticket_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "reopen") {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "open" })
      .eq("id", ticket_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
