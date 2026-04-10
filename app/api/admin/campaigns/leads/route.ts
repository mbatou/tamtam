import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/admin/campaigns/leads — List leads for a campaign (brand or admin)
// Query params: campaign_id (required), status (optional), format (optional: "csv")
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const campaignId = request.nextUrl.searchParams.get("campaign_id");
  const statusFilter = request.nextUrl.searchParams.get("status");
  const format = request.nextUrl.searchParams.get("format");

  if (!campaignId) {
    return NextResponse.json({ error: "campaign_id requis" }, { status: 400 });
  }

  // Verify campaign ownership (or admin/superadmin role)
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (!isAdmin) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("batteur_id")
      .eq("id", campaignId)
      .single();

    if (!campaign || campaign.batteur_id !== brandId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }
  }

  // Build query
  let query = supabase
    .from("leads")
    .select("id, name, phone, email, custom_fields, fraud_score, status, payout_amount, payout_status, echo_id, created_at, verified_at")
    .eq("campaign_id", campaignId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // CSV export
  if (format === "csv") {
    const rows = leads || [];
    const headers = ["Nom", "Telephone", "Email", "Statut", "Score Fraude", "Montant Payout", "Date"];
    const csvLines = [
      headers.join(","),
      ...rows.map((l) => [
        `"${(l.name || "").replace(/"/g, '""')}"`,
        `"${l.phone}"`,
        `"${l.email || ""}"`,
        l.status,
        l.fraud_score,
        l.payout_amount || 0,
        l.created_at,
      ].join(",")),
    ];
    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${campaignId.slice(0, 8)}.csv"`,
      },
    });
  }

  // JSON response with summary
  const total = (leads || []).length;
  const verified = (leads || []).filter((l) => l.status === "verified").length;
  const rejected = (leads || []).filter((l) => l.status === "rejected").length;
  const flagged = (leads || []).filter((l) => l.status === "flagged").length;
  const pending = (leads || []).filter((l) => l.status === "pending").length;

  return NextResponse.json({
    leads: leads || [],
    summary: { total, verified, rejected, flagged, pending },
  });
}

// ---------------------------------------------------------------------------
// PUT /api/admin/campaigns/leads — Update lead status (verify/reject manually)
// Body: { lead_id, action: "verify" | "reject", reason? }
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const body = await request.json();
  const { lead_id, action, reason } = body;

  if (!lead_id || !["verify", "reject"].includes(action)) {
    return NextResponse.json({ error: "lead_id et action (verify|reject) requis" }, { status: 400 });
  }

  // Get lead with campaign info
  const { data: lead } = await supabase
    .from("leads")
    .select("id, campaign_id, echo_id, status, payout_status")
    .eq("id", lead_id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
  }

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("batteur_id, cost_per_lead_fcfa, title")
    .eq("id", lead.campaign_id)
    .single();

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  if (!isAdmin && campaign?.batteur_id !== brandId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  if (action === "verify" && lead.status === "flagged") {
    // Manually verify a flagged lead — trigger CPL payment
    const updates: Record<string, unknown> = {
      status: "verified",
      verified_at: new Date().toISOString(),
    };

    // Pay echo if not already paid
    if (lead.echo_id && lead.payout_status !== "paid" && campaign?.cost_per_lead_fcfa) {
      const { ECHO_LEAD_SHARE_PERCENT } = await import("@/lib/constants");
      const echoEarnings = Math.floor(campaign.cost_per_lead_fcfa * ECHO_LEAD_SHARE_PERCENT / 100);

      const { data: debitSuccess } = await supabase.rpc("debit_campaign_for_lead", {
        p_campaign_id: lead.campaign_id,
        p_cpl: campaign.cost_per_lead_fcfa,
        p_echo_id: lead.echo_id,
        p_echo_earnings: echoEarnings,
      });

      if (debitSuccess) {
        updates.payout_amount = echoEarnings;
        updates.payout_status = "paid";

        const { logWalletTransaction } = await import("@/lib/wallet-transactions");
        await logWalletTransaction({
          supabase,
          userId: lead.echo_id,
          amount: echoEarnings,
          type: "lead_earning",
          description: `Lead verifie manuellement`,
          sourceId: lead.id,
          sourceType: "lead",
        });
      } else {
        updates.payout_status = "failed";
        updates.rejection_reason = "budget_exhausted";
      }
    }

    await supabase.from("leads").update(updates).eq("id", lead_id);
    return NextResponse.json({ success: true, action: "verified" });
  }

  if (action === "reject") {
    await supabase
      .from("leads")
      .update({
        status: "rejected",
        rejection_reason: reason || "manual_rejection",
      })
      .eq("id", lead_id);
    return NextResponse.json({ success: true, action: "rejected" });
  }

  return NextResponse.json({ error: "Action non applicable pour ce statut" }, { status: 400 });
}
