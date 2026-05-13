import { SITE_URL } from "@/lib/constants";

export async function trackConversion({
  event,
  tmRef,
  externalId,
  value,
  currency = "XOF",
  metadata = {},
}: {
  event: string;
  tmRef?: string | null;
  externalId: string;
  value?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}) {
  const pixelId = process.env.TAMTAM_PIXEL_ID;
  const apiKey = process.env.TAMTAM_PIXEL_API_KEY;

  if (!pixelId || !apiKey) {
    console.warn("Pixel not configured — skipping conversion tracking");
    return null;
  }

  try {
    const response = await fetch(`${SITE_URL}/api/v1/conversions`, {
      method: "POST",
      headers: {
        "X-Tamtam-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pixel_id: pixelId,
        event,
        tm_ref: tmRef || undefined,
        external_id: externalId,
        value: value || undefined,
        currency,
        metadata,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Conversion tracking error:", error);
    return null;
  }
}
