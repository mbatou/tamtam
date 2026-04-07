import { createServiceClient } from "@/lib/supabase/server";

export type EchoSegment = "active" | "semi_active" | "dormant";

export interface SegmentedEcho {
  id: string;
  email: string;
  firstName: string;
  segment: EchoSegment;
  lastSeenDaysAgo: number;
}

/**
 * Segment Échos for the interests email campaign.
 *
 * Segments:
 * - active: auth last_sign_in_at within 7 days
 * - semi_active: 8-30 days ago
 * - dormant: 30+ days or never signed in
 *
 * Excludes:
 * - Échos who already completed interests
 * - Soft-deleted users
 * - Users without email
 * - Previously bounced/complained emails
 */
export async function segmentEchosForInterestsCampaign(): Promise<SegmentedEcho[]> {
  const supabase = createServiceClient();

  // Fetch all Écho users who haven't completed interests
  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, interests_completed_at")
    .eq("role", "echo")
    .is("deleted_at", null)
    .is("interests_completed_at", null);

  if (error || !users) {
    console.error("Segmentation query failed:", error);
    return [];
  }

  // Get previously bounced emails to exclude
  const { data: bounced } = await supabase
    .from("email_sends")
    .select("user_id")
    .in("status", ["bounced", "complained"]);

  const bouncedUserIds = new Set((bounced || []).map((b: { user_id: string }) => b.user_id));

  // Get auth data for all these users (email + last_sign_in_at)
  // Supabase admin listUsers is paginated, but we can batch getUserById
  // For 1152 users, we'll fetch auth data in batches
  const now = Date.now();
  const segmented: SegmentedEcho[] = [];

  // Process in batches of 50 to avoid overwhelming the auth API
  const BATCH_SIZE = 50;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const authResults = await Promise.all(
      batch.map(async (user) => {
        if (bouncedUserIds.has(user.id)) return null;

        try {
          const { data } = await supabase.auth.admin.getUserById(user.id);
          if (!data?.user?.email) return null;

          const lastSignIn = data.user.last_sign_in_at
            ? new Date(data.user.last_sign_in_at).getTime()
            : new Date(data.user.created_at).getTime();
          const daysAgo = Math.floor((now - lastSignIn) / 86400000);

          let segment: EchoSegment;
          if (daysAgo <= 7) segment = "active";
          else if (daysAgo <= 30) segment = "semi_active";
          else segment = "dormant";

          // Extract first name from full name
          const firstName = user.name?.split(" ")[0] || "Écho";

          return {
            id: user.id,
            email: data.user.email,
            firstName,
            segment,
            lastSeenDaysAgo: daysAgo,
          };
        } catch {
          return null;
        }
      })
    );

    for (const result of authResults) {
      if (result) segmented.push(result);
    }
  }

  return segmented;
}
