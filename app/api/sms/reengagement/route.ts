import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendTestSms } from "@/lib/sms/mtarget-test";

export const dynamic = "force-dynamic";

const DORMANT_ECHO_IDS = [
  "c620207b-2e53-49e5-980f-e997b7a1014e",
  "d985daa6-eff9-4c3c-8e3d-23b245b39703",
  "65f22c64-aea1-4a73-a8b8-d8f685c5644e",
  "ad3bef10-e646-4b2c-8fb4-1ff004ff7b40",
  "44a11e65-47c1-45dd-9c82-80b8c369f096",
  "e071f97f-edb2-4a26-a650-2f2e15c1bd77",
  "1e1f902a-4998-42ee-adfa-1abab9d28856",
  "6731d24b-26d3-4b5c-ac2b-6a35f6905224",
  "60c878b2-1941-4014-b1a0-c0acd0ff4aeb",
  "f5d87bc4-0a45-4307-b32c-362a84293ce7",
  "443f6973-480c-4413-ab90-e2f65835dbd0",
  "ee7424c6-d162-44ae-a581-4bc93e8b780d",
  "12330442-147b-4d65-a033-89c129e05084",
  "376ead2b-0b42-4f15-96c7-0f22e4831eb7",
  "8e2ef345-42fe-4109-948f-c4904360eda0",
  "0fa3ec33-1b07-4c53-9239-ee8e0a79426c",
  "0254c4d0-5cfe-4734-8a4f-d4a45523bc74",
  "2850e24f-a824-44ca-9b84-063f1c7a9590",
  "b77752b5-fd3c-4b50-b3a4-efe0699be57a",
  "583ec326-8055-4ee9-8ee3-fc507e49357e",
  "1eb5fa88-495d-458a-a44b-d6f2af52be07",
  "b4223c17-e10d-428a-8f68-d70801184d73",
  "622e8c92-f251-4530-9251-1a15cb1ee28e",
  "1621d1f5-a266-4018-9e81-02e9ec8ed246",
  "651fa45b-40ca-4ab2-848e-54b4df1b7d4d",
  "f8868571-fa56-49d0-b1f6-ee2cfdd555c3",
  "77714ba7-b3d4-4239-89ab-bf997e7fdf57",
  "f78aefb6-8543-4722-bcad-c31dd348fc43",
  "d20d3ad0-ad5b-425d-9299-36a8764d93c8",
  "acd3943d-9ef0-40cd-9a02-52a653174cf0",
  "ef8d3e13-02d9-4f30-9f63-872c2f3d2d49",
  "3b1314a8-52db-46d9-a10c-af29a0acd24c",
  "c7e1095f-a0b7-40c8-914c-a5d92f1c1e3e",
  "e2403131-e8b0-4eaa-9e0c-9b27c307f742",
  "2b8df461-300c-4638-b8aa-344a50dae258",
  "bb9d633e-fe09-486a-8b78-f210f75e7a60",
  "92b2ba66-b1c6-4cf0-adab-97ca7d58d276",
  "e71388b8-42d4-4e59-9cfd-86c6e6465622",
  "69ceb45e-0f3a-4d47-9187-35820d7cb174",
  "f3a6b868-ad31-49e4-bffe-5f2da2e37353",
  "2e2cfbf1-c22d-4bb5-8528-90583d4b9d08",
  "ff41f620-46c2-4651-a780-ae35a3f6b3d7",
  "85c682e2-de7e-449a-8888-69eb76d303ef",
  "7dda49d5-eb02-4b7e-99e1-a1f2e9e6e207",
  "977f21cd-0a29-40b1-92fb-0331cacc5ff1",
  "2034277f-e7bc-4de3-9a95-d7f2f872fa10",
];

function extractFirstName(fullName: string): string {
  // Strip non-ASCII (emojis, special unicode), keep letters/digits/spaces/hyphens/apostrophes
  const clean = fullName
    .replace(/[^\x20-\x7EÀ-ɏ]/g, "")
    .trim()
    .split(/\s+/)[0] || "";

  if (clean.length < 2) return "Echo";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const p = phone.replace(/[\s\-.]/g, "");
  if (p.startsWith("+221")) return p;
  if (p.startsWith("00221")) return `+221${p.slice(5)}`;
  if (p.startsWith("221") && p.length === 12) return `+${p}`;
  if (/^[73]\d{8}$/.test(p)) return `+221${p}`;
  return null;
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();
  if (!session) return false;
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  return user?.role === "superadmin";
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: echos } = await supabase
    .from("users")
    .select("id, name, phone, city")
    .in("id", DORMANT_ECHO_IDS)
    .is("deleted_at", null);

  if (!echos?.length) {
    return NextResponse.json({ error: "No eligible Echos found" }, { status: 400 });
  }

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [] as Array<{
      id: string;
      name: string;
      phone: string | null;
      firstName: string;
      status: string;
      reason?: string;
      ticket?: string;
      latencyMs?: number;
      error?: string;
    }>,
  };

  for (const echo of echos) {
    const phone = normalizePhone(echo.phone || "");

    if (!phone) {
      results.skipped++;
      results.details.push({
        id: echo.id,
        name: echo.name,
        phone: echo.phone,
        firstName: "",
        status: "skipped",
        reason: "invalid_phone",
      });
      continue;
    }

    const firstName = extractFirstName(echo.name || "Echo");
    const message = `TamTam: Salut ${firstName}! Une campagne t'attend. 50 FCFA par clic verifie sur Wave. Rejoins: tamma.me/echo/rythmes STOP 36180`;

    const result = await sendTestSms({ phone, message, sender: "TamTam" });

    await supabase.from("sms_test_logs").insert({
      user_id: echo.id,
      phone,
      message,
      sender: "TamTam",
      mtarget_ticket: result.ticket,
      status: result.success ? "sent" : "failed",
      error_code: result.errorCode?.toString(),
      error_message: result.error,
      latency_ms: result.latencyMs,
      raw_response: result.rawResponse,
      notes: "reengagement_june_2026",
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
    }

    results.details.push({
      id: echo.id,
      name: echo.name,
      phone,
      firstName,
      status: result.success ? "sent" : "failed",
      ticket: result.ticket,
      latencyMs: result.latencyMs,
      error: result.error,
    });

    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    success: true,
    total: echos.length,
    ...results,
    costEstimateFcfa: results.sent * 5,
    timestamp: new Date().toISOString(),
  });
}
