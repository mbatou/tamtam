import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getRoadmapMetrics, autoCheckMilestones } from "@/lib/roadmap-metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getRoadmapMetrics();

  // Auto-check milestones on each page load
  await autoCheckMilestones(data.currentValues);

  // Re-fetch milestones after auto-check to get updated state
  const { data: updatedMilestones } = await supabase
    .from("roadmap_milestones")
    .select("*")
    .order("sort_order");

  return NextResponse.json({
    ...data,
    milestones: updatedMilestones || data.milestones,
    fetchedAt: new Date().toISOString(),
  });
}
