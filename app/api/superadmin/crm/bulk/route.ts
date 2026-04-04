import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
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

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const { action, userIds, data } = await request.json();

  if (!userIds || userIds.length === 0) {
    return NextResponse.json({ error: "No users selected" }, { status: 400 });
  }

  switch (action) {
    case "send_invitation": {
      const { data: users } = await supabase
        .from("users")
        .select("id, email, name, company_name")
        .in("id", userIds);

      let sentCount = 0;
      for (const user of users || []) {
        try {
          await sendEmail({
            to: user.email,
            subject: data?.subject || "Rejoignez Tamtam!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #D35400;">🥁 Tamtam</h2>
                <p>Bonjour ${user.company_name || user.name},</p>
                <p>${data?.message || "Votre compte est prêt! Connectez-vous pour lancer votre première campagne."}</p>
                <a href="https://www.tamma.me/login" style="display: inline-block; background: #D35400; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Se connecter
                </a>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">
                  Tamtam — Le bouche-à-oreille digital au Sénégal
                </p>
              </div>
            `,
          });
          sentCount++;
        } catch (e) {
          console.error(`Failed to send email to ${user.email}:`, e);
        }
      }

      // Log activity
      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: auth.session.user.id,
          action: "crm_bulk_email",
          target_type: "user",
          target_id: userIds[0],
          details: { count: sentCount, subject: data?.subject },
        });
      } catch {}

      return NextResponse.json({ success: true, sent: sentCount });
    }

    case "delete": {
      let deletedCount = 0;
      for (const userId of userIds) {
        const { data: user } = await supabase
          .from("users")
          .select("email")
          .eq("id", userId)
          .single();

        if (user) {
          const hash = crypto.createHash("sha256").update(user.email).digest("hex").substring(0, 16);
          await supabase
            .from("users")
            .update({
              name: "Deleted account",
              email: `deleted_${hash}@deleted.tamma.me`,
              original_email: user.email,
              phone: null,
              city: null,
              company_name: null,
              balance: 0,
              deleted_at: new Date().toISOString(),
              deletion_reason: data?.reason || "Admin deletion (bulk)",
            })
            .eq("id", userId);

          try { await supabase.auth.admin.deleteUser(userId); } catch {}
          deletedCount++;
        }
      }

      // Log activity
      try {
        await supabase.from("admin_activity_log").insert({
          admin_id: auth.session.user.id,
          action: "crm_bulk_delete",
          target_type: "user",
          target_id: userIds[0],
          details: { count: deletedCount, reason: data?.reason },
        });
      } catch {}

      return NextResponse.json({ success: true, deleted: deletedCount });
    }

    case "export": {
      const { data: users } = await supabase
        .from("users")
        .select("name, email, phone, company_name, city, role, balance, created_at")
        .in("id", userIds);

      return NextResponse.json({ users: users || [] });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
