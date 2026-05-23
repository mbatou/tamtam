import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { unlockCampaignEarnings } from "@/lib/unlock-earnings";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Find all pending earnings where the campaign is no longer active
  const { data: pendingList } = await supabase
    .from("pending_earnings")
    .select("id, echo_id, campaign_id, campaign_name, amount_fcfa, click_count")
    .eq("status", "pending")
    .gt("amount_fcfa", 0);

  if (!pendingList || pendingList.length === 0) {
    return NextResponse.json({ stuck: 0, total_fcfa: 0, campaigns: [] });
  }

  const campaignIds = Array.from(new Set(pendingList.map(p => p.campaign_id)));
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status")
    .in("id", campaignIds);

  const campaignMap = new Map((campaigns || []).map(c => [c.id, c]));

  const stuckRecords = pendingList.filter(pe => {
    const campaign = campaignMap.get(pe.campaign_id);
    return campaign && campaign.status !== "active";
  });

  const stuckByCampaign = new Map<string, { title: string; status: string; echos: number; total_fcfa: number }>();
  for (const pe of stuckRecords) {
    const campaign = campaignMap.get(pe.campaign_id)!;
    const entry = stuckByCampaign.get(pe.campaign_id) || { title: campaign.title, status: campaign.status, echos: 0, total_fcfa: 0 };
    entry.echos++;
    entry.total_fcfa += pe.amount_fcfa;
    stuckByCampaign.set(pe.campaign_id, entry);
  }

  return NextResponse.json({
    stuck: stuckRecords.length,
    total_fcfa: stuckRecords.reduce((s, r) => s + r.amount_fcfa, 0),
    campaigns: Array.from(stuckByCampaign.entries()).map(([id, v]) => ({ id, ...v })),
  });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dry_run !== false;

  const { data: pendingList } = await supabase
    .from("pending_earnings")
    .select("id, echo_id, campaign_id, campaign_name, amount_fcfa, click_count")
    .eq("status", "pending")
    .gt("amount_fcfa", 0);

  if (!pendingList || pendingList.length === 0) {
    return NextResponse.json({ fixed: 0, total_fcfa: 0, dry_run: dryRun });
  }

  const campaignIds = Array.from(new Set(pendingList.map(p => p.campaign_id)));
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status")
    .in("id", campaignIds);

  const campaignMap = new Map((campaigns || []).map(c => [c.id, c]));

  // Find campaigns that are no longer active
  const stuckCampaignIds = new Set<string>();
  for (const pe of pendingList) {
    const campaign = campaignMap.get(pe.campaign_id);
    if (campaign && campaign.status !== "active") {
      stuckCampaignIds.add(pe.campaign_id);
    }
  }

  if (dryRun) {
    const totalFcfa = pendingList
      .filter(pe => stuckCampaignIds.has(pe.campaign_id))
      .reduce((s, r) => s + r.amount_fcfa, 0);

    return NextResponse.json({
      dry_run: true,
      campaigns_to_fix: stuckCampaignIds.size,
      echos_to_credit: pendingList.filter(pe => stuckCampaignIds.has(pe.campaign_id)).length,
      total_fcfa: totalFcfa,
      message: "Send POST with { dry_run: false } to execute",
    });
  }

  // Execute: unlock earnings for each stuck campaign
  let fixedCount = 0;
  let totalFixed = 0;
  const results: { campaign_id: string; title: string; echos_unlocked: number }[] = [];

  for (const campaignId of Array.from(stuckCampaignIds)) {
    const campaign = campaignMap.get(campaignId)!;
    const unlocked = await unlockCampaignEarnings(campaignId, campaign.title || campaignId);
    fixedCount += unlocked;
    const campaignTotal = pendingList
      .filter(pe => pe.campaign_id === campaignId)
      .reduce((s, r) => s + r.amount_fcfa, 0);
    totalFixed += campaignTotal;
    results.push({ campaign_id: campaignId, title: campaign.title, echos_unlocked: unlocked });
  }

  return NextResponse.json({
    dry_run: false,
    fixed: fixedCount,
    total_fcfa: totalFixed,
    campaigns: results,
  });
}
