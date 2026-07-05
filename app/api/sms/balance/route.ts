import { NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";
import { checkMtargetBalance } from "@/lib/sms/sms-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthResponse(["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const balance = await checkMtargetBalance();
  return NextResponse.json(balance);
}
