import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAwaSystemPrompt } from "@/lib/awa-system-prompt";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import { rateLimit } from "@/lib/rate-limit";
import type { AwaBrandData } from "@/types/awa";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("AWA_NOT_CONFIGURED", { status: 503 });
  }

  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { allowed } = rateLimit(`awa:${session.user.id}`, 20, 3600000);
  if (!allowed) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const { messages, brandData } = (await req.json()) as {
    messages: { role: string; content: string }[];
    brandData: AwaBrandData;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid messages", { status: 400 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);
  const { data: brand } = await supabase
    .from("users")
    .select("name")
    .eq("id", brandId)
    .single();

  const language = brandData?.language || "fr";
  const enrichedBrandData: AwaBrandData = {
    ...brandData,
    brandName: brand?.name || brandData?.brandName || "Brand",
    language,
  };

  const systemPrompt = getAwaSystemPrompt({ language, brandData: enrichedBrandData });

  try {
    const client = new Anthropic();

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch {
          controller.enqueue(encoder.encode("\n[Error generating response]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response("AWA_SERVICE_ERROR", { status: 500 });
  }
}
