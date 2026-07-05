import { NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;
  const userId = auth.authUser.id;

  const { data: links } = await supabase
    .from("tracked_links")
    .select("id")
    .eq("echo_id", userId);

  if (!links || links.length === 0) {
    return NextResponse.json({ total: 0, valid: 0, invalid: 0, validity_rate: 100 });
  }

  const linkIds = links.map(l => l.id);

  const [totalRes, validRes] = await Promise.all([
    supabase.from("clicks").select("id", { count: "exact", head: true }).in("link_id", linkIds),
    supabase.from("clicks").select("id", { count: "exact", head: true }).in("link_id", linkIds).eq("is_valid", true),
  ]);

  const total = totalRes.count || 0;
  const valid = validRes.count || 0;
  const invalid = total - valid;
  const validity_rate = total > 0 ? Math.round((valid / total) * 100) : 100;

  return NextResponse.json({ total, valid, invalid, validity_rate });
}
