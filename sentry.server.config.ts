import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV ?? "development",
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event) {
    // Strip lead form PII before sending to Sentry
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (data.phone) data.phone = "[redacted]";
      if (data.name) data.name = "[redacted]";
      if (data.email) data.email = "[redacted]";
    }
    return event;
  },
});
