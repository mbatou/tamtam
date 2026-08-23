import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve user email addresses.
 *
 * `public.users` has NO email column — addresses live in `auth.users`. Any
 * query doing `.from("users").select("... email ...")` silently returns null
 * (PostgREST 42703), which is how the "earnings unlocked" notification came
 * to be dead in production. Always go through this helper instead.
 *
 * Small sets are fetched by id (cheap, exact). Large sets fall back to a
 * FULLY PAGINATED listUsers sweep — the previous `listUsers({ perPage: 1000 })`
 * calls silently dropped every user past #1000, and the platform is already
 * past that.
 */

const BY_ID_THRESHOLD = 25;
const PAGE_SIZE = 1000;
const MAX_PAGES = 100; // 100k users — a guard against an unbounded loop

export async function getUserEmails(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return emails;

  if (unique.length <= BY_ID_THRESHOLD) {
    const results = await Promise.all(
      unique.map(async (id) => {
        try {
          const { data } = await supabase.auth.admin.getUserById(id);
          return [id, data?.user?.email] as const;
        } catch (err) {
          console.error(`[user-emails] getUserById failed for ${id}:`, err);
          return [id, undefined] as const;
        }
      })
    );
    for (const [id, email] of results) {
      if (email) emails.set(id, email);
    }
    return emails;
  }

  const wanted = new Set(unique);
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      console.error("[user-emails] listUsers failed on page", page, error.message);
      break;
    }
    const batch = data?.users || [];
    for (const u of batch) {
      if (u.email && wanted.has(u.id)) emails.set(u.id, u.email);
    }
    if (batch.length < PAGE_SIZE) break; // last page
    if (emails.size === wanted.size) break; // found everyone
  }

  return emails;
}

/** Convenience for a single user. */
export async function getUserEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const map = await getUserEmails(supabase, [userId]);
  return map.get(userId) ?? null;
}

/**
 * Every auth user's email, fully paginated. Use for platform-wide fan-outs
 * (weekly summaries, nudges) that previously truncated at 1000.
 */
export async function getAllUserEmails(supabase: SupabaseClient): Promise<Map<string, string>> {
  const emails = new Map<string, string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      console.error("[user-emails] listUsers failed on page", page, error.message);
      break;
    }
    const batch = data?.users || [];
    for (const u of batch) {
      if (u.email) emails.set(u.id, u.email);
    }
    if (batch.length < PAGE_SIZE) break;
  }

  return emails;
}
