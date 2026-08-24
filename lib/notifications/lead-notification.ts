import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildLeadReceivedEmail } from "@/lib/email";
import { sendRoutedEmail } from "./email-router";

// ---------------------------------------------------------------------------
// LUP-113: Lead delivery to the brand that paid for it.
//
// This is the `lead_received` event — distinct from `batteur_lead_received`,
// which is the ops alert for a prospect who wants to BECOME a brand. The two
// shared a name and that is how they got conflated.
// ---------------------------------------------------------------------------

interface LeadNotificationInput {
  supabase: SupabaseClient;
  brandId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string | null;
  campaignId: string;
  campaignTitle: string;
  /** Landing-page override; falls back to the brand's account email. */
  notificationEmail?: string | null;
}

/**
 * Deliver a captured lead to the brand.
 *
 * Non-blocking — failures are logged, never propagated. The lead is already
 * saved and billed by the time this runs.
 */
export async function notifyNewLead(input: LeadNotificationInput): Promise<void> {
  try {
    const { subject, html } = buildLeadReceivedEmail({
      leadName: input.leadName,
      leadPhone: input.leadPhone,
      leadEmail: input.leadEmail,
      campaignTitle: input.campaignTitle,
    });

    const result = await sendRoutedEmail(input.supabase, {
      event: "lead_received",
      userId: input.brandId,
      campaignId: input.campaignId,
      // Wave-style redelivery does not apply here, but a retried form POST
      // does: the lead id keys the ledger so one lead means one email.
      reference: input.leadId,
      // The landing page can name a different inbox (a sales address, say).
      // When it does not, the router resolves the brand's account email —
      // this used to `return` early and send nothing at all, so a brand that
      // never filled in the optional field silently received none of the
      // leads they were paying for.
      email: input.notificationEmail || undefined,
      subject,
      html,
    });

    if (result.status === "failed") {
      console.error(`[lead-notification] delivery failed for lead ${input.leadId}: ${result.error}`);
    }
  } catch (err) {
    console.error(`[lead-notification] failed for lead ${input.leadId}:`, err);
  }
}
