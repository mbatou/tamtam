import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateLeadSchema } from "@/lib/validations";
import { sendBatteurWelcomeEmail, sendRoleUpgradeEmail } from "@/lib/email";
import crypto from "crypto";
import { requireAuth } from "@/lib/api/auth";
import { apiError, validationError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

const addNoteBodySchema = z.object({
  action: z.literal("add_note"),
  contact_id: z.string().uuid("Identifiant contact invalide"),
  contact_type: z.string().min(1, "Type de contact requis").max(30),
  content: z.string().min(1, "Contenu requis").max(2000),
  note_type: z.string().max(30).optional().nullable(),
  followup_date: z.string().max(40).optional().nullable(),
});

const deleteNoteBodySchema = z.object({
  action: z.literal("delete_note"),
  note_id: z.string().uuid("Identifiant note invalide"),
});

const updateStageBodySchema = z.object({
  action: z.literal("update_stage"),
  user_id: z.string().uuid("Identifiant utilisateur invalide"),
  crm_stage: z.string().min(1, "Étape requise").max(50),
});

const updateTagsBodySchema = z.object({
  action: z.literal("update_tags"),
  contact_id: z.string().uuid("Identifiant contact invalide"),
  contact_type: z.string().min(1, "Type de contact requis").max(30),
  tags: z.array(z.string().max(50)).max(50).optional().nullable(),
});

const updateLeadStatusBodySchema = z.object({
  action: z.literal("update_lead_status"),
  lead_id: z.string().uuid("Identifiant lead invalide"),
});

const convertLeadBodySchema = z.object({
  action: z.literal("convert_lead"),
  lead_id: z.string().uuid("Identifiant lead invalide"),
  // Optional override; the UI may send an empty string to fall back to the lead's email.
  email: z.string().email("Email invalide").max(200).optional().nullable().or(z.literal("")),
});

async function requireSuperadmin() {
  try {
    return await requireAuth(["superadmin"]);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "brands"; // brands | echos
  const search = searchParams.get("search") || "";
  const city = searchParams.get("city") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  // Fetch auth users once for email lookup
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((authUsers || []).map(u => [u.id, u.email || ""]));

  if (view === "brands") {
    let query = supabase
      .from("users")
      .select("id, name, phone, company_name, city, role, balance, created_at, deleted_at, terms_accepted_at, crm_tags", { count: "exact" })
      .eq("role", "batteur")
      .is("deleted_at", null);

    if (search) {
      // Search by name/company in DB, email search done client-side after merge
      query = query.or(`company_name.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (city) {
      query = query.eq("city", city);
    }

    const { data: brands, count } = await query
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    // Enrich each brand with pipeline stage
    const brandIds = (brands || []).map(b => b.id);

    if (brandIds.length === 0) {
      return NextResponse.json({
        users: [],
        total: count || 0,
        page,
        limit,
        stageCounts: { registered: 0, recharged: 0, first_campaign: 0, repeat: 0, vip: 0 },
      });
    }

    // Get campaign counts per brand
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("batteur_id, status")
      .in("batteur_id", brandIds);

    // Get recharge status per brand
    const { data: recharges } = await supabase
      .from("wallet_transactions")
      .select("user_id, amount")
      .in("user_id", brandIds)
      .gt("amount", 0);

    // Get team members count
    const { data: teams } = await supabase
      .from("brand_team_members")
      .select("brand_owner_id")
      .in("brand_owner_id", brandIds)
      .eq("status", "active");

    // Compute pipeline stage for each brand
    const campaignsByBrand: Record<string, { batteur_id: string; status: string }[]> = {};
    for (const c of campaigns || []) {
      if (!campaignsByBrand[c.batteur_id]) campaignsByBrand[c.batteur_id] = [];
      campaignsByBrand[c.batteur_id].push(c);
    }

    const rechargedBrands = new Set((recharges || []).map(r => r.user_id));
    const teamCountByBrand: Record<string, number> = {};
    for (const t of teams || []) {
      teamCountByBrand[t.brand_owner_id] = (teamCountByBrand[t.brand_owner_id] || 0) + 1;
    }

    const enrichedBrands = (brands || []).map(brand => {
      const brandCampaigns = campaignsByBrand[brand.id] || [];
      const hasRecharged = rechargedBrands.has(brand.id);
      const campaignCount = brandCampaigns.length;
      const activeCampaigns = brandCampaigns.filter(c => c.status === "active").length;

      let pipelineStage = "registered";
      if (campaignCount >= 3) pipelineStage = "vip";
      else if (campaignCount >= 2) pipelineStage = "repeat";
      else if (campaignCount >= 1) pipelineStage = "first_campaign";
      else if (hasRecharged) pipelineStage = "recharged";

      return {
        ...brand,
        email: emailMap.get(brand.id) || "",
        pipelineStage,
        campaignCount,
        activeCampaigns,
        hasRecharged,
        teamMembers: teamCountByBrand[brand.id] || 0,
      };
    });

    // Filter by pipeline stage if requested
    const filteredBrands = status
      ? enrichedBrands.filter(b => b.pipelineStage === status)
      : enrichedBrands;

    // Pipeline stage counts
    const stageCounts = {
      registered: enrichedBrands.filter(b => b.pipelineStage === "registered").length,
      recharged: enrichedBrands.filter(b => b.pipelineStage === "recharged").length,
      first_campaign: enrichedBrands.filter(b => b.pipelineStage === "first_campaign").length,
      repeat: enrichedBrands.filter(b => b.pipelineStage === "repeat").length,
      vip: enrichedBrands.filter(b => b.pipelineStage === "vip").length,
    };

    return NextResponse.json({
      users: filteredBrands,
      total: count || 0,
      page,
      limit,
      stageCounts,
    });
  } else {
    // Échos view
    let query = supabase
      .from("users")
      .select("id, name, phone, city, role, balance, created_at, deleted_at", { count: "exact" })
      .eq("role", "echo")
      .is("deleted_at", null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (city) {
      query = query.eq("city", city);
    }

    const { data: echos, count } = await query
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    // Enrich with click counts and activity
    const echoIds = (echos || []).map(e => e.id);

    const clicksByEcho: Record<string, { total: number; valid: number }> = {};

    if (echoIds.length > 0) {
      const { data: clickData } = await supabase
        .from("tracked_links")
        .select("echo_id, clicks!inner(is_valid)")
        .in("echo_id", echoIds);

      for (const link of clickData || []) {
        if (!clicksByEcho[link.echo_id]) clicksByEcho[link.echo_id] = { total: 0, valid: 0 };
        clicksByEcho[link.echo_id].total++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((link as Record<string, any>).clicks?.is_valid) clicksByEcho[link.echo_id].valid++;
      }
    }

    const enrichedEchos = (echos || []).map(echo => ({
      ...echo,
      email: emailMap.get(echo.id) || "",
      totalClicks: clicksByEcho[echo.id]?.total || 0,
      validClicks: clicksByEcho[echo.id]?.valid || 0,
    }));

    return NextResponse.json({
      users: enrichedEchos,
      total: count || 0,
      page,
      limit,
    });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const authUser = auth.authUser;
  const body = await request.json();
  const { action } = body;

  // --- Add note ---
  if (action === "add_note") {
    const parsed = addNoteBodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { contact_id, contact_type, content, note_type, followup_date } = body;
    if (!contact_id || !contact_type || !content) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const { data, error } = await supabase.from("crm_notes").insert({
      contact_id,
      contact_type,
      author_id: authUser.id,
      content,
      note_type: note_type || "note",
      followup_date: followup_date || null,
    }).select().single();

    if (error) {
      console.error("[superadmin/crm] note insert failed:", error);
      return apiError(500, "Erreur interne");
    }
    return NextResponse.json(data);
  }

  // --- Delete note ---
  if (action === "delete_note") {
    const parsed = deleteNoteBodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { note_id } = body;
    if (!note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    const { error } = await supabase.from("crm_notes").delete().eq("id", note_id);
    if (error) {
      console.error("[superadmin/crm] note delete failed:", error);
      return apiError(500, "Erreur interne");
    }
    return NextResponse.json({ success: true });
  }

  // --- Update brand stage ---
  if (action === "update_stage") {
    const parsed = updateStageBodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { user_id, crm_stage } = body;
    if (!user_id || !crm_stage) return NextResponse.json({ error: "Required fields" }, { status: 400 });

    const { error } = await supabase.from("users").update({ crm_stage }).eq("id", user_id);
    if (error) {
      console.error("[superadmin/crm] stage update failed:", error);
      return apiError(500, "Erreur interne");
    }
    return NextResponse.json({ success: true });
  }

  // --- Update tags ---
  if (action === "update_tags") {
    const parsed = updateTagsBodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { contact_id, contact_type, tags } = body;
    if (!contact_id || !contact_type) return NextResponse.json({ error: "Required fields" }, { status: 400 });

    const table = contact_type === "brand" ? "users" : "brand_leads";
    const col = contact_type === "brand" ? "crm_tags" : "tags";
    const { error } = await supabase.from(table).update({ [col]: tags || [] }).eq("id", contact_id);
    if (error) {
      console.error("[superadmin/crm] tags update failed:", error);
      return apiError(500, "Erreur interne");
    }
    return NextResponse.json({ success: true });
  }

  // --- Update lead status ---
  if (action === "update_lead_status") {
    const parsedBody = updateLeadStatusBodySchema.safeParse(body);
    if (!parsedBody.success) return validationError(parsedBody.error);
    const { lead_id, status, notes } = body;
    if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const parsed = updateLeadSchema.safeParse({ status, notes });
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

    const { data, error } = await supabase
      .from("brand_leads")
      .update(updates)
      .eq("id", lead_id)
      .select()
      .single();

    if (error) {
      console.error("[superadmin/crm] lead status update failed:", error);
      return apiError(500, "Erreur interne");
    }
    return NextResponse.json(data);
  }

  // --- Convert lead to brand ---
  if (action === "convert_lead") {
    const parsed = convertLeadBodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { lead_id, email: overrideEmail, promote_echo } = body;
    if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const { data: lead } = await supabase
      .from("brand_leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.status === "converted") {
      return NextResponse.json({ error: "This lead is already converted." }, { status: 400 });
    }

    const accountEmail = overrideEmail || lead.email;

    // Check if email already exists in auth
    const { data: authList } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authList?.users?.find(
      (u) => u.email?.toLowerCase() === accountEmail.toLowerCase()
    );

    if (existingAuthUser) {
      const { data: existingProfile } = await supabase
        .from("users")
        .select("id, role, name")
        .eq("id", existingAuthUser.id)
        .single();

      if (existingProfile) {
        if (existingProfile.role === "echo" && promote_echo) {
          const { error: updateError } = await supabase
            .from("users")
            .update({ role: "batteur" })
            .eq("id", existingProfile.id);

          if (updateError) {
            console.error("[superadmin/crm] echo promotion failed:", updateError);
            return apiError(500, "Erreur interne");
          }

          await supabase
            .from("brand_leads")
            .update({
              status: "converted",
              notes: `Echo promu Batteur le ${new Date().toLocaleDateString("fr-FR")}. ${lead.notes || ""}`.trim(),
            })
            .eq("id", lead_id);

          try {
            await supabase.from("admin_activity_log").insert({
              admin_id: authUser.id,
              action: "promote_echo_to_batteur",
              target_type: "user",
              target_id: existingProfile.id,
              details: { lead_id, business_name: lead.business_name, email: accountEmail },
            });
          } catch {}

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

    const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
      email: accountEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !createdUser.user) {
      if (authError?.message?.includes("already been registered") || authError?.message?.includes("already exists")) {
        return NextResponse.json({
          error: "This email is already registered. Please use a different email.",
          email_conflict: true,
        }, { status: 409 });
      }
      console.error("[superadmin/crm] lead account creation failed:", authError);
      return apiError(500, "Erreur interne");
    }

    const { error: profileError } = await supabase.from("users").insert({
      id: createdUser.user.id,
      name: lead.business_name || lead.contact_name,
      phone: lead.whatsapp || null,
      role: "batteur",
      balance: 0,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(createdUser.user.id);
      console.error("[superadmin/crm] lead profile insert failed:", profileError);
      return apiError(500, "Erreur interne");
    }

    await supabase
      .from("brand_leads")
      .update({
        status: "converted",
        notes: `Account created on ${new Date().toLocaleDateString("en-US")} (${accountEmail}). ${lead.notes || ""}`.trim(),
      })
      .eq("id", lead_id);

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: authUser.id,
        action: "convert_lead",
        target_type: "user",
        target_id: createdUser.user.id,
        details: { lead_id, business_name: lead.business_name, email: accountEmail },
      });
    } catch {}

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
      user_id: createdUser.user.id,
      email_sent: true,
      email_used: accountEmail,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
