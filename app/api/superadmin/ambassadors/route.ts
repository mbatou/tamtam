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

// GET — list all ambassadors with stats
export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = auth.supabase;
  const ambassadorId = request.nextUrl.searchParams.get("id");

  // Detail view — single ambassador with referrals and commissions
  if (ambassadorId) {
    const { data: ambassador } = await supabase
      .from("ambassadors")
      .select("*")
      .eq("id", ambassadorId)
      .single();

    if (!ambassador) return NextResponse.json({ error: "Ambassadeur introuvable" }, { status: 404 });

    const { data: referrals } = await supabase
      .from("ambassador_referrals")
      .select("*, users!ambassador_referrals_brand_user_id_fkey(name, company_name)")
      .eq("ambassador_id", ambassadorId)
      .order("signed_up_at", { ascending: false });

    const { data: commissions } = await supabase
      .from("ambassador_commissions")
      .select("*, campaigns!ambassador_commissions_campaign_id_fkey(title)")
      .eq("ambassador_id", ambassadorId)
      .order("created_at", { ascending: false });

    // Count active referrals (those with at least 1 campaign)
    const activeReferrals = (referrals || []).filter(r => r.status === "active").length;

    return NextResponse.json({
      ambassador,
      referrals: referrals || [],
      commissions: commissions || [],
      activeReferrals,
    });
  }

  // List view
  const { data: ambassadors } = await supabase
    .from("ambassadors")
    .select("*")
    .order("created_at", { ascending: false });

  // Aggregate stats
  const list = ambassadors || [];
  const totalReferrals = list.reduce((s, a) => s + (a.total_referrals || 0), 0);
  const totalEarned = list.reduce((s, a) => s + (a.total_earned || 0), 0);
  const totalPending = list.reduce((s, a) => s + ((a.total_earned || 0) - (a.total_paid || 0)), 0);

  return NextResponse.json({
    ambassadors: list,
    stats: {
      totalAmbassadors: list.length,
      totalReferrals,
      totalEarned,
      totalPending,
    },
  });
}

// POST — create ambassador or mark commissions as paid
export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = auth.supabase;
  const body = await request.json();

  // Mark as paid
  if (body.action === "pay" && body.ambassador_id) {
    const { data: ambassador } = await supabase
      .from("ambassadors")
      .select("id, total_earned, total_paid")
      .eq("id", body.ambassador_id)
      .single();

    if (!ambassador) return NextResponse.json({ error: "Ambassadeur introuvable" }, { status: 404 });

    const pendingAmount = (ambassador.total_earned || 0) - (ambassador.total_paid || 0);
    if (pendingAmount <= 0) return NextResponse.json({ error: "Aucune commission en attente" }, { status: 400 });

    // Mark all earned commissions as paid
    await supabase
      .from("ambassador_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("ambassador_id", body.ambassador_id)
      .eq("status", "earned");

    await supabase
      .from("ambassadors")
      .update({
        total_paid: (ambassador.total_paid || 0) + pendingAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.ambassador_id);

    return NextResponse.json({ success: true, paidAmount: pendingAmount });
  }

  // Toggle status
  if (body.action === "toggle_status" && body.ambassador_id) {
    const { data: amb } = await supabase
      .from("ambassadors")
      .select("status")
      .eq("id", body.ambassador_id)
      .single();

    if (!amb) return NextResponse.json({ error: "Ambassadeur introuvable" }, { status: 404 });

    const newStatus = amb.status === "active" ? "inactive" : "active";
    await supabase.from("ambassadors").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", body.ambassador_id);
    return NextResponse.json({ success: true, status: newStatus });
  }

  // Create ambassador
  const { name, email, phone, referral_code, commission_rate } = body;
  if (!name || !email || !referral_code) {
    return NextResponse.json({ error: "Nom, email et code de parrainage requis" }, { status: 400 });
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from("ambassadors")
    .select("id")
    .or(`email.eq.${email},referral_code.eq.${referral_code}`)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Email ou code de parrainage déjà utilisé" }, { status: 409 });
  }

  const { data: ambassador, error: createErr } = await supabase
    .from("ambassadors")
    .insert({
      name,
      email,
      phone: phone || null,
      referral_code,
      commission_rate: commission_rate || 5,
    })
    .select()
    .single();

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

  return NextResponse.json({ success: true, ambassador });
}
