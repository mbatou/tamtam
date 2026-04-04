import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { updateLeadSchema } from "@/lib/validations";
import { sendBatteurWelcomeEmail, sendRoleUpgradeEmail } from "@/lib/email";
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
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: leads } = await auth.supabase
    .from("brand_leads")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json(leads || []);
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const parsed = updateLeadSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
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
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, email: overrideEmail, promote_echo } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Get lead
  const { data: lead } = await auth.supabase
    .from("brand_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status === "converted") {
    return NextResponse.json({ error: "This lead is already converted." }, { status: 400 });
  }

  // Use override email if provided (for cases where lead email is already taken)
  const accountEmail = overrideEmail || lead.email;

  // Check if email already exists in auth
  const { data: authList } = await auth.supabase.auth.admin.listUsers();
  const existingAuthUser = authList?.users?.find(
    (u) => u.email?.toLowerCase() === accountEmail.toLowerCase()
  );

  if (existingAuthUser) {
    // Check if this auth user already has a profile
    const { data: existingProfile } = await auth.supabase
      .from("users")
      .select("id, role, name")
      .eq("id", existingAuthUser.id)
      .single();

    if (existingProfile) {
      // If user is an Echo and we want to promote them to Batteur
      if (existingProfile.role === "echo" && promote_echo) {
        const { error: updateError } = await auth.supabase
          .from("users")
          .update({ role: "batteur" })
          .eq("id", existingProfile.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Update lead status
        await auth.supabase
          .from("brand_leads")
          .update({
            status: "converted",
            notes: `Echo promu Batteur le ${new Date().toLocaleDateString("fr-FR")}. ${lead.notes || ""}`.trim(),
          })
          .eq("id", id);

        // Log activity
        try {
          await auth.supabase.from("admin_activity_log").insert({
            admin_id: auth.session.user.id,
            action: "promote_echo_to_batteur",
            target_type: "user",
            target_id: existingProfile.id,
            details: { lead_id: id, business_name: lead.business_name, email: accountEmail },
          });
        } catch {}

        // Send upgrade notification email
        try {
          await sendRoleUpgradeEmail({
            to: accountEmail,
            name: existingProfile.name || lead.business_name,
          });
        } catch (e) {
          console.error("Upgrade email failed:", e);
        }

        return NextResponse.json({
          success: true,
          user_id: existingProfile.id,
          promoted: true,
          email_used: accountEmail,
        });
      }

      // Email exists but promotion not requested — return conflict with option to promote
      return NextResponse.json({
        error: `This email is already used by a ${existingProfile.role === "echo" ? "Echo" : existingProfile.role} account.`,
        email_conflict: true,
        existing_role: existingProfile.role,
        can_promote: existingProfile.role === "echo",
      }, { status: 409 });
    }
  }

  // Generate temporary password
  const tempPassword = crypto.randomBytes(8).toString("hex") + "A1!";

  // Create auth user
  const { data: authUser, error: authError } = await auth.supabase.auth.admin.createUser({
    email: accountEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    if (authError?.message?.includes("already been registered") || authError?.message?.includes("already exists")) {
      return NextResponse.json({
        error: "This email is already registered. Please use a different email.",
        email_conflict: true,
      }, { status: 409 });
    }
    return NextResponse.json({ error: authError?.message || "Account creation error" }, { status: 500 });
  }

  // Create user profile (users table has: id, role, name, phone, city, balance, etc.)
  const { error: profileError } = await auth.supabase.from("users").insert({
    id: authUser.user.id,
    name: lead.business_name || lead.contact_name,
    phone: lead.whatsapp || null,
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
    .update({
      status: "converted",
      notes: `Account created on ${new Date().toLocaleDateString("en-US")} (${accountEmail}). ${lead.notes || ""}`.trim(),
    })
    .eq("id", id);

  // Log activity
  try {
    await auth.supabase.from("admin_activity_log").insert({
      admin_id: auth.session.user.id,
      action: "convert_lead",
      target_type: "user",
      target_id: authUser.user.id,
      details: { lead_id: id, business_name: lead.business_name, email: accountEmail },
    });
  } catch {}

  // Send welcome email with login credentials
  try {
    await sendBatteurWelcomeEmail({
      to: accountEmail,
      temporaryPassword: tempPassword,
      business_name: lead.business_name,
    });
  } catch (e) {
    console.error("Welcome email failed:", e);
  }

  return NextResponse.json({
    success: true,
    user_id: authUser.user.id,
    email_sent: true,
    email_used: accountEmail,
  });
}
