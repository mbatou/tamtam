import { NextRequest, NextResponse } from "next/server";
import { paytechConfig } from "@/lib/paytech";

export async function GET(req: NextRequest) {
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
