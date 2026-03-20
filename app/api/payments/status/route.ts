import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paytechConfig } from "@/lib/paytech";

export async function GET(req: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requis" }, { status: 400 });
  }

  const response = await fetch(
    `${paytechConfig.baseUrl}/payment/get-status?token_payment=${token}`,
    {
      headers: {
        API_KEY: paytechConfig.apiKey,
        API_SECRET: paytechConfig.apiSecret,
      },
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
