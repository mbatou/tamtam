import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { updateLeadSchema } from "@/lib/validations";
import { sendBatteurWelcomeEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: leads } = await auth.supabase
    .from("brand_leads")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json(leads || []);
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const parsed = updateLeadSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const { data, error } = await auth.supabase
    .from("brand_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: Convert lead to Batteur account
export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  // Get lead
  const { data: lead } = await auth.supabase
    .from("brand_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });
  if (lead.status === "converted") {
    return NextResponse.json({ error: "Ce lead est déjà converti." }, { status: 400 });
  }

  // Check if email already exists
  const { data: existingUser } = await auth.supabase
    .from("users")
    .select("id")
    .eq("email", lead.email)
    .limit(1);

  if (existingUser?.length) {
    return NextResponse.json({ error: "Un utilisateur avec cet email existe déjà." }, { status: 400 });
  }

  // Generate temporary password
  const tempPassword = crypto.randomBytes(4).toString("hex") + "A1!";

  // Create auth user
  const { data: authUser, error: authError } = await auth.supabase.auth.admin.createUser({
    email: lead.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message || "Erreur création compte" }, { status: 500 });
  }

  // Create user profile
  const { error: profileError } = await auth.supabase.from("users").insert({
    id: authUser.user.id,
    email: lead.email,
    full_name: lead.contact_name,
    role: "batteur",
    balance: 0,
  });

  if (profileError) {
    // Rollback auth user
    await auth.supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Update lead status
  await auth.supabase
    .from("brand_leads")
    .update({ status: "converted", notes: `Compte créé le ${new Date().toLocaleDateString("fr-FR")}. ${lead.notes || ""}`.trim() })
    .eq("id", id);

  // Log activity
  try {
    await auth.supabase.from("admin_activity_log").insert({
      admin_id: auth.session.user.id,
      action: "convert_lead",
      target_type: "user",
      target_id: authUser.user.id,
      details: { lead_id: id, business_name: lead.business_name, email: lead.email },
    });
  } catch {}

  // Send welcome email
  try {
    await sendBatteurWelcomeEmail({
      to: lead.email,
      temporaryPassword: tempPassword,
      business_name: lead.business_name,
    });
  } catch (e) {
    console.error("Welcome email failed:", e);
  }

  return NextResponse.json({ success: true, user_id: authUser.user.id });
}
