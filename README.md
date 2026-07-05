# Tamtam

Tamtam is a word-of-mouth marketing platform for Senegal: brands ("batteurs") fund campaigns, everyday creators ("échos") share tracked links with their audience and earn FCFA per verified click, lead, or conversion. Payouts run on Wave.

## Stack

- **Web app** — Next.js 14 (App Router) + TypeScript (strict) + Tailwind, deployed on Vercel
- **Database/Auth** — Supabase (Postgres, RLS, service-role API routes)
- **Payments** — Wave (checkout for wallet top-ups, B2B payouts, signed webhooks)
- **Email** — Resend (svix-signed webhooks) · **SMS** — MTarget · **Push** — web-push (VAPID)
- **Monitoring** — Sentry

## Repository layout

| Path | What it is |
|---|---|
| `app/` | Next.js routes — `(landing)`, `(auth)`, `(echo)` creator app, `admin/` brand console, `superadmin/` ops console, `api/` (~140 routes) |
| `components/`, `lib/`, `types/` | Shared UI, server libraries (`lib/api` auth/cron kernel, wallet, notifications, sms, reconciliation), domain types |
| `supabase/migrations/` | SQL migrations (partial — core schema is managed in Supabase; see audit) |
| `__tests__/` | Vitest suites |
| `tamtam-app/` | Expo React Native mobile app (own package.json) |
| `tamtam-pixel-extension/` | Chrome MV3 helper extension for installing the conversion pixel |
| `docs/` | Setup guides + audit reports |

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase, Wave, Resend, VAPID, etc.
npm run dev
```

Checks (run by CI on every PR):

```bash
npm run typecheck
npm run lint
npm test
```

## Conventions

- API routes authenticate through `lib/api/auth.ts` (`requireAuth`, role allowlists — uses `auth.getUser()`), cron routes through `lib/api/cron.ts` (`verifyCronSecret`), provider webhooks fail closed in production.
- Data access in API routes uses `createServiceClient()` from `lib/supabase/server.ts`; browser code uses `lib/supabase/client.ts`.
- Cron schedules live in `vercel.json` and must match `app/api/cron/*`.
- i18n: keys in `messages/{fr,en}.json` via `useTranslation()` from `lib/i18n`.
