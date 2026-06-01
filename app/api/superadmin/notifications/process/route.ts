import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { processNotificationQueue, getVapidError } from "@/lib/notifications/sender";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || !["superadmin", "admin"].includes(user.role)) return null;
  return { session, supabase };
}

export async function POST() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await processNotificationQueue(auth.supabase);
    const vErr = getVapidError();
    if (vErr) {
      return NextResponse.json({ ok: true, ...result, vapidWarning: vErr });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[process-queue] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
