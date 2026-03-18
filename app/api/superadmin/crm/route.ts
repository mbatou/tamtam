import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "all"; // all | leads | brands | followups
  const contactId = searchParams.get("id");
  const contactType = searchParams.get("type"); // lead | brand

  // --- Single contact detail with timeline ---
  if (contactId && contactType) {
    const timeline: { type: string; date: string; data: Record<string, unknown> }[] = [];

    if (contactType === "brand") {
      // Fetch brand user
      const { data: user } = await supabase
        .from("users")
        .select("id, name, phone, role, city, balance, total_earned, crm_stage, crm_tags, created_at, status, total_recharged")
        .eq("id", contactId)
        .single();
      if (!user) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

      // Campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title, budget, spent, status, cpc, created_at")
        .eq("batteur_id", contactId)
        .order("created_at", { ascending: false });

      // Payments
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, status, payment_method, created_at, completed_at")
        .eq("user_id", contactId)
        .order("created_at", { ascending: false });

      // Support tickets
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("id, subject, status, created_at")
        .eq("user_id", contactId)
        .order("created_at", { ascending: false });

      // CRM notes
      const { data: notes } = await supabase
        .from("crm_notes")
        .select("id, content, note_type, followup_date, created_at, author_id")
        .eq("contact_id", contactId)
        .eq("contact_type", "brand")
        .order("created_at", { ascending: false });

      // Fetch note authors
      const authorIds = Array.from(new Set((notes || []).map(n => n.author_id)));
      const { data: authors } = authorIds.length > 0
        ? await supabase.from("users").select("id, name").in("id", authorIds)
        : { data: [] };
      const authorMap: Record<string, string> = {};
      (authors || []).forEach(a => { authorMap[a.id] = a.name; });

      // Build timeline
      timeline.push({ type: "created", date: user.created_at, data: { name: user.name } });
      for (const c of campaigns || []) {
        timeline.push({ type: "campaign", date: c.created_at, data: c });
      }
      for (const p of payments || []) {
        timeline.push({ type: "payment", date: p.created_at, data: p });
      }
      for (const t of tickets || []) {
        timeline.push({ type: "ticket", date: t.created_at, data: t });
      }
      for (const n of notes || []) {
        timeline.push({ type: "note", date: n.created_at, data: { ...n, author_name: authorMap[n.author_id] || "Admin" } });
      }
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return NextResponse.json({
        contact: { ...user, type: "brand" },
        campaigns: campaigns || [],
        payments: payments || [],
        tickets: tickets || [],
        notes: (notes || []).map(n => ({ ...n, author_name: authorMap[n.author_id] || "Admin" })),
        timeline,
      });
    }

    if (contactType === "lead") {
      const { data: lead } = await supabase
        .from("brand_leads")
        .select("*")
        .eq("id", contactId)
        .single();
      if (!lead) return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });

      const { data: notes } = await supabase
        .from("crm_notes")
        .select("id, content, note_type, followup_date, created_at, author_id")
        .eq("contact_id", contactId)
        .eq("contact_type", "lead")
        .order("created_at", { ascending: false });

      const authorIds = Array.from(new Set((notes || []).map(n => n.author_id)));
      const { data: authors } = authorIds.length > 0
        ? await supabase.from("users").select("id, name").in("id", authorIds)
        : { data: [] };
      const authorMap: Record<string, string> = {};
      (authors || []).forEach(a => { authorMap[a.id] = a.name; });

      const timeline: { type: string; date: string; data: Record<string, unknown> }[] = [];
      timeline.push({ type: "lead_created", date: lead.created_at, data: lead });
      for (const n of notes || []) {
        timeline.push({ type: "note", date: n.created_at, data: { ...n, author_name: authorMap[n.author_id] || "Admin" } });
      }
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return NextResponse.json({
        contact: { ...lead, type: "lead" },
        notes: (notes || []).map(n => ({ ...n, author_name: authorMap[n.author_id] || "Admin" })),
        timeline,
      });
    }
  }

  // --- Contacts list ---
  const results: { id: string; name: string; email: string; phone: string | null; type: "lead" | "brand"; stage: string; tags: string[]; created_at: string; stats: Record<string, unknown> }[] = [];

  // Brands (batteur users)
  if (view === "all" || view === "brands") {
    const { data: brands } = await supabase
      .from("users")
      .select("id, name, phone, city, balance, total_earned, crm_stage, crm_tags, created_at, status, total_recharged")
      .eq("role", "batteur")
      .order("created_at", { ascending: false });

    // Get campaign counts per brand
    const { data: campaignCounts } = await supabase
      .from("campaigns")
      .select("batteur_id, id");

    const brandCampaigns: Record<string, number> = {};
    (campaignCounts || []).forEach(c => {
      brandCampaigns[c.batteur_id] = (brandCampaigns[c.batteur_id] || 0) + 1;
    });

    for (const b of brands || []) {
      results.push({
        id: b.id,
        name: b.name,
        email: "",
        phone: b.phone,
        type: "brand",
        stage: b.crm_stage || "onboarding",
        tags: b.crm_tags || [],
        created_at: b.created_at,
        stats: {
          balance: b.balance,
          total_earned: b.total_earned,
          total_recharged: b.total_recharged || 0,
          campaigns: brandCampaigns[b.id] || 0,
          city: b.city,
          status: b.status,
        },
      });
    }
  }

  // Leads (not converted)
  if (view === "all" || view === "leads") {
    const { data: leads } = await supabase
      .from("brand_leads")
      .select("*")
      .in("status", ["new", "contacted"])
      .order("created_at", { ascending: false });

    for (const l of leads || []) {
      results.push({
        id: l.id,
        name: l.contact_name || l.business_name,
        email: l.email,
        phone: l.whatsapp,
        type: "lead",
        stage: l.status,
        tags: l.tags || [],
        created_at: l.created_at,
        stats: { business_name: l.business_name, message: l.message },
      });
    }
  }

  // Upcoming follow-ups
  let followups: { id: string; contact_id: string; contact_type: string; content: string; followup_date: string; note_type: string }[] = [];
  if (view === "all" || view === "followups") {
    const { data: fups } = await supabase
      .from("crm_notes")
      .select("id, contact_id, contact_type, content, followup_date, note_type")
      .not("followup_date", "is", null)
      .gte("followup_date", new Date().toISOString().split("T")[0])
      .order("followup_date", { ascending: true })
      .limit(20);
    followups = fups || [];
  }

  // Sort all contacts by date
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ contacts: results, followups });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const body = await request.json();
  const { action } = body;

  // --- Add note ---
  if (action === "add_note") {
    const { contact_id, contact_type, content, note_type, followup_date } = body;
    if (!contact_id || !contact_type || !content) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const { data, error } = await supabase.from("crm_notes").insert({
      contact_id,
      contact_type,
      author_id: session.user.id,
      content,
      note_type: note_type || "note",
      followup_date: followup_date || null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // --- Delete note ---
  if (action === "delete_note") {
    const { note_id } = body;
    if (!note_id) return NextResponse.json({ error: "note_id requis" }, { status: 400 });

    const { error } = await supabase.from("crm_notes").delete().eq("id", note_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // --- Update brand stage ---
  if (action === "update_stage") {
    const { user_id, crm_stage } = body;
    if (!user_id || !crm_stage) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

    const { error } = await supabase.from("users").update({ crm_stage }).eq("id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // --- Update tags ---
  if (action === "update_tags") {
    const { contact_id, contact_type, tags } = body;
    if (!contact_id || !contact_type) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

    const table = contact_type === "brand" ? "users" : "brand_leads";
    const col = contact_type === "brand" ? "crm_tags" : "tags";
    const { error } = await supabase.from(table).update({ [col]: tags || [] }).eq("id", contact_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
