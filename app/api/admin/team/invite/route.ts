import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Only the brand owner can invite
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, brand_owner_id, company_name")
    .eq("id", session.user.id)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (currentUser.brand_owner_id) {
    return NextResponse.json(
      { error: "Seul le propriétaire peut inviter des membres" },
      { status: 403 }
    );
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from("brand_team_members")
    .select("id, status")
    .eq("brand_owner_id", currentUser.id)
    .eq("email", email.toLowerCase())
    .neq("status", "removed")
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Ce membre a déjà été invité" },
      { status: 400 }
    );
  }

  // Check if email already has a Tamtam account
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  // Create the invitation
  const { data: invitation } = await supabase
    .from("brand_team_members")
    .insert({
      brand_owner_id: currentUser.id,
      member_user_id: existingUser?.id || null,
      email: email.toLowerCase(),
      status: existingUser ? "active" : "invited",
      accepted_at: existingUser ? new Date().toISOString() : null,
      invited_by: currentUser.id,
    })
    .select()
    .single();

  // If user already exists, link them to this brand
  if (existingUser) {
    await supabase
      .from("users")
      .update({ brand_owner_id: currentUser.id })
      .eq("id", existingUser.id);
  }

  // Send invitation email
  const brandName = currentUser.company_name || "votre marque";
  const signupLink = existingUser
    ? "https://www.tamma.me/login"
    : `https://www.tamma.me/signup/brand?team_invite=${invitation?.id}`;

  try {
    await sendEmail({
      to: email,
      subject: `${brandName} vous invite à rejoindre Tamtam`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #D35400;">Tamtam</h2>
          <p>Bonjour,</p>
          <p><strong>${brandName}</strong> vous invite à rejoindre leur équipe sur Tamtam.</p>
          <p>Tamtam est une plateforme de marketing WhatsApp qui permet de toucher des milliers de personnes au Sénégal.</p>
          ${
            existingUser
              ? "<p>Vous avez déjà un compte. Connectez-vous pour accéder au tableau de bord de l'équipe:</p>"
              : "<p>Créez votre compte pour commencer:</p>"
          }
          <a href="${signupLink}" style="display: inline-block; background: #D35400; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            ${existingUser ? "Se connecter" : "Créer mon compte"}
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Tamtam — Le bouche-à-oreille digital au Sénégal<br>
            <a href="mailto:support@tamma.me" style="color: #888;">support@tamma.me</a> ·
            <a href="https://wa.me/221762799393" style="color: #25D366;">WhatsApp</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send team invite email:", err);
  }

  return NextResponse.json({ success: true, invitation });
}
