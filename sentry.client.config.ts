import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  debug: process.env.NODE_ENV === "development",
});
