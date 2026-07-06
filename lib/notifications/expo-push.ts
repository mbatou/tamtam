import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Native push delivery via the Expo push service (mobile app tokens).
 * Complements web-push: the same notification fans out to a user's browser
 * subscriptions (push_subscriptions) and native devices (push_tokens).
 *
 * Tokens live in push_tokens (see 20260706_push_tokens.sql) and are pruned
 * when Expo reports DeviceNotRegistered.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushContent {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendExpoPushToUser(
  supabase: SupabaseClient,
  userId: string,
  content: ExpoPushContent
): Promise<boolean> {
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("id, token")
    .eq("user_id", userId);

  if (!tokens || tokens.length === 0) return false;

  const messages = tokens.map((t) => ({
    to: t.token,
    title: content.title,
    body: content.body,
    sound: "default",
    channelId: "default",
    data: { url: content.url || "/", tag: content.tag || null },
  }));

  let anySent = false;
  const deadTokenIds: string[] = [];

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error("[expo-push] HTTP", res.status);
      return false;
    }

    const result = (await res.json()) as {
      data?: Array<{ status: "ok" | "error"; details?: { error?: string } }>;
    };

    (result.data || []).forEach((ticket, i) => {
      if (ticket.status === "ok") {
        anySent = true;
      } else if (ticket.details?.error === "DeviceNotRegistered") {
        deadTokenIds.push(tokens[i].id);
      }
    });
  } catch (err) {
    console.error("[expo-push] send failed:", err instanceof Error ? err.message : err);
    return false;
  }

  if (deadTokenIds.length > 0) {
    await supabase.from("push_tokens").delete().in("id", deadTokenIds);
  }

  return anySent;
}

/** Whether the user has at least one registered native device. */
export async function hasExpoTokens(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("push_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count || 0) > 0;
}
