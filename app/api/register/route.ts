import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { userId, name, phone, city, mobile_money_provider } = await req.json();

  if (!userId || !name || !mobile_money_provider) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("users").upsert(
    {
      id: userId,
      role: "echo",
      name,
      phone: phone || null,
      city: city || null,
      mobile_money_provider,
      terms_accepted_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
