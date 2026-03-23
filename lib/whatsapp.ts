import twilio from "twilio";

let _client: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return _client;
}

const FROM = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+221762799393";

export interface WhatsAppMessage {
  to: string; // phone number, e.g. "+221771234567"
  body: string;
  mediaUrl?: string;
}

/**
 * Format a Senegalese phone number for WhatsApp.
 * Handles: "77 123 45 67", "0771234567", "221771234567", "+221771234567", "771234567"
 */
export function formatSenegalPhone(phone: string): string {
  let clean = phone.replace(/[\s\-()]/g, "");
  if (clean.startsWith("00221")) clean = "+" + clean.slice(2);
  if (clean.startsWith("221") && !clean.startsWith("+")) clean = "+" + clean;
  if (/^[7]/.test(clean) && clean.length <= 9) clean = "+221" + clean;
  if (clean.startsWith("0")) clean = "+221" + clean.slice(1);
  return clean;
}

/**
 * Send a single WhatsApp message via Twilio.
 */
export async function sendWhatsApp({
  to,
  body,
  mediaUrl,
}: WhatsAppMessage): Promise<boolean> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("Twilio not configured — skipping WhatsApp to", to);
    return false;
  }

  try {
    const formattedTo = formatSenegalPhone(to);

    const params: Record<string, unknown> = {
      from: FROM,
      to: `whatsapp:${formattedTo}`,
      body,
    };

    if (mediaUrl) {
      params.mediaUrl = [mediaUrl];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await getClient().messages.create(params as any);
    console.log(`WhatsApp sent to ${formattedTo}: ${message.sid}`);
    return true;
  } catch (error) {
    console.error(`WhatsApp failed to ${to}:`, error);
    return false;
  }
}

/**
 * Send WhatsApp to multiple recipients with rate limiting.
 */
export async function broadcastWhatsApp(
  recipients: { phone: string; body: string; mediaUrl?: string }[],
  delayMs = 500,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const success = await sendWhatsApp({
      to: recipient.phone,
      body: recipient.body,
      mediaUrl: recipient.mediaUrl,
    });

    if (success) sent++;
    else failed++;

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { sent, failed };
}
