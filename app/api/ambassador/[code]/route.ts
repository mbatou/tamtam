import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createServiceClient();

  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("name, total_referrals, total_earned, total_paid, commission_rate, status")
    .eq("referral_code", code)
    .single();

  if (!ambassador || ambassador.status !== "active") {
    return NextResponse.json({ error: "Ambassadeur non trouvé" }, { status: 404 });
  }

  const { data: referrals } = await supabase
    .from("ambassador_referrals")
    .select("signed_up_at, status, total_campaigns, total_commission_earned, users!ambassador_referrals_brand_user_id_fkey(company_name, name)")
    .eq("referral_code", code)
    .order("signed_up_at", { ascending: false });

  const formattedReferrals = (referrals || []).map(r => {
    const users = r.users as { company_name?: string; name?: string } | null;
    return {
      signed_up_at: r.signed_up_at,
      status: r.status,
      total_campaigns: r.total_campaigns,
      total_commission_earned: r.total_commission_earned,
      brand_name: users?.company_name || users?.name || "Marque",
    };
  });

  return NextResponse.json({
    ambassador: {
      name: ambassador.name,
      total_referrals: ambassador.total_referrals,
      total_earned: ambassador.total_earned,
      total_paid: ambassador.total_paid,
      commission_rate: ambassador.commission_rate,
    },
    referrals: formattedReferrals,
  });
}
