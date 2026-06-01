import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { processNotificationQueue } from "@/lib/notifications/sender";

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

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = auth;
  const body = await request.json().catch(() => ({}));

  // Allow force-cancelling all stuck pending notifications
  if (body.action === "cancel_pending") {
    const now = new Date().toISOString();
    const { data: pending } = await supabase
      .from("notification_queue")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(1000);

    if (pending && pending.length > 0) {
      await supabase
        .from("notification_queue")
        .update({ status: "failed", suppression_reason: "manually_cancelled" })
        .in("id", pending.map((n: { id: string }) => n.id));
    }

    return NextResponse.json({ ok: true, cancelled: pending?.length || 0 });
  }

  try {
    const result = await processNotificationQueue(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[process-queue] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
