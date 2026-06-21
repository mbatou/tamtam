export async function sendTestSms({
  phone,
  message,
  sender = "TamTam",
}: {
  phone: string;
  message: string;
  sender?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  ticket?: string;
  smsCount?: number;
  latencyMs: number;
  error?: string;
  errorCode?: number;
  rawResponse: string;
}> {
  const start = Date.now();

  let normalized = phone.replace(/\s/g, "");
  if (normalized.startsWith("00221")) normalized = `+221${normalized.slice(5)}`;
  else if (normalized.startsWith("221")) normalized = `+${normalized}`;
  else if (/^[0-9]{9}$/.test(normalized)) normalized = `+221${normalized}`;

  const params = new URLSearchParams({
    username: process.env.MTARGET_USERNAME!,
    password: process.env.MTARGET_PASSWORD!,
    msisdn: normalized,
    msg: message,
    sender,
    serviceid: process.env.MTARGET_SERVICEID || "36453",
  });

  try {
    const response = await fetch(
      `${process.env.MTARGET_API_URL || "https://api-public.mtarget.fr"}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: AbortSignal.timeout(45000),
      }
    );

    const latencyMs = Date.now() - start;
    const rawResponse = await response.text();

    try {
      const json = JSON.parse(rawResponse);
      if (json.results && json.results[0]) {
        const r = json.results[0];
        const ticket = r.ticket as string | undefined;
        const smsCount = parseInt(r.smscount || "0");
        const code = parseInt(r.code || "0");

        if (code === 0 && ticket) {
          return { success: true, ticket, smsCount, latencyMs, rawResponse };
        }
        return {
          success: false,
          errorCode: code,
          error: r.reason || getSmsError(code),
          latencyMs,
          rawResponse,
        };
      }
    } catch {
      // Not JSON — fall through to legacy URLSearchParams parsing
    }

    const parsed = new URLSearchParams(rawResponse);
    const ticket = parsed.get("ticket");
    const smsCount = parseInt(parsed.get("smscount") || "0");
    const errorCode = parseInt(rawResponse);

    if (ticket) {
      return { success: true, ticket, smsCount, latencyMs, rawResponse };
    } else if (!isNaN(errorCode) && errorCode < 0) {
      return {
        success: false,
        errorCode,
        latencyMs,
        rawResponse,
        error: getSmsError(errorCode),
      };
    }

    return {
      success: false,
      error: `Unexpected response: ${rawResponse}`,
      rawResponse,
      latencyMs,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      rawResponse: "",
      latencyMs: Date.now() - start,
    };
  }
}

export async function checkMtargetBalance() {
  const params = new URLSearchParams({
    username: process.env.MTARGET_USERNAME!,
    password: process.env.MTARGET_PASSWORD!,
  });

  try {
    const res = await fetch(
      `${process.env.MTARGET_API_URL || "https://api-public.mtarget.fr"}/balance`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );
    const text = await res.text();
    const parsed = new URLSearchParams(text);
    return {
      amount: parsed.get("amount"),
      currency: parsed.get("currency"),
      raw: text,
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function getSmsError(code: number): string {
  const map: Record<number, string> = {
    [-1]: "Auth failed — wrong username/password",
    [-2]: "Invalid phone number format",
    [-3]: "Invalid operator",
    [-4]: "No route — Senegal (+221) not activated on this account",
    [-9]: "ServiceID 36453 not found",
    [-11]: "Not enough credit (need to top up)",
    [-14]: "Maximum message limit reached",
  };
  return map[code] || `mTarget error code: ${code}`;
}
