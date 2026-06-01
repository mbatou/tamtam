import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || !["superadmin", "admin"].includes(user.role)) return null;
  return true;
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pub = process.env.VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  const nextPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

  const toBytes = (k: string) => {
    try {
      const b64 = k.replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(b64, "base64").length;
    } catch {
      return -1;
    }
  };

  return NextResponse.json({
    VAPID_PUBLIC_KEY: {
      set: pub.length > 0,
      chars: pub.length,
      decodedBytes: toBytes(pub),
      first10: pub.slice(0, 10) + "...",
      last10: "..." + pub.slice(-10),
      requiredBytes: 65,
    },
    VAPID_PRIVATE_KEY: {
      set: priv.length > 0,
      chars: priv.length,
      decodedBytes: toBytes(priv),
      first10: priv.slice(0, 10) + "...",
      last10: "..." + priv.slice(-10),
      requiredBytes: 32,
    },
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: {
      set: nextPub.length > 0,
      chars: nextPub.length,
    },
  });
}
