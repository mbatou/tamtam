import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, name, companyName, phone, password } = body;

  if (!email || !name || !companyName || !phone || !password) {
    return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Format d'email invalide." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Rate limit: max 5 requests per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("verification_codes")
    .select("*", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .gte("created_at", oneHourAgo);

  if ((count || 0) >= 5) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 1 heure." }, { status: 429 });
  }

  // Check if email already registered
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = users?.find((u) => u.email === email.toLowerCase());
  if (existingUser) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
  }

  // Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  // Store code with 15-min expiry
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await supabase.from("verification_codes").insert({
    email: email.toLowerCase(),
    code: hashedCode,
    type: "brand_signup",
    expires_at: expiresAt,
    metadata: { name, companyName, phone, password },
  });

  // Send OTP email
  await sendEmail({
    to: email,
    subject: "Votre code de vérification Tamtam",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #D35400; font-size: 28px; margin-bottom: 5px;">Tamtam</h1>
          <p style="color: #888; font-size: 14px;">Le bouche-à-oreille digital</p>
        </div>
        <div style="background: #fef3e2; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0;">
          <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Votre code de vérification :</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #D35400; font-family: monospace;">
            ${code}
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 15px;">
            Ce code expire dans 15 minutes.
          </p>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">
          Si vous n'avez pas demandé ce code, ignorez cet email.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
