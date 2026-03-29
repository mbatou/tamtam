import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { analyzeWithAI } from "@/lib/ai-analyst";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth check: superadmin only
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabaseAdmin = createServiceClient();
  const { data: currentUser } = await supabaseAdmin
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { metrics } = await req.json();

  if (!metrics) {
    return NextResponse.json({ error: "No metrics provided" }, { status: 400 });
  }

  try {
    const analysis = await analyzeWithAI(metrics);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("AI analysis failed:", error);
    return NextResponse.json({
      error: "Analyse IA échouée",
      detail: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
