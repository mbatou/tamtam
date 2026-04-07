# Email Setup — Resend SMTP

## Overview

Tamtam uses [Resend](https://resend.com) for transactional and campaign emails.
Supabase Auth emails (password reset, magic links) are routed through Resend SMTP.
Programmatic emails (campaigns) use the Resend API via `lib/email.ts`.

## Domain Verification (One-time)

1. Go to [Resend Dashboard → Domains](https://resend.com/domains)
2. Click **Add Domain** → enter `tamma.me`
3. Add the DNS records to the domain registrar:
   - **SPF**: TXT record at `@` → `v=spf1 include:resend.com ~all`
   - **DKIM**: CNAME records (Resend provides 3)
   - **DMARC**: TXT record at `_dmarc` → `v=DMARC1; p=none;`
4. Wait for verification (usually minutes, can take up to 48h)
5. Once verified, the sender `noreply@tamma.me` is ready

**Testing before verification:** Use `onboarding@resend.dev` as sender.

## Supabase Auth SMTP Configuration

1. Go to **Supabase Dashboard → Authentication → Email Templates → SMTP Settings**
2. Toggle **"Use custom SMTP server"** ON
3. Enter:
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend`
   - **Password:** The Resend API key (`re_xxxxx` from Vercel env vars)
   - **Sender email:** `noreply@tamma.me`
   - **Sender name:** `Tamtam`
4. Click **Save**
5. Test by triggering a password reset on a test account

## Environment Variables

Required in `.env.local` and Vercel:

```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Tamtam <noreply@tamma.me>
INTERNAL_SECRET=<random-string-for-internal-api-auth>
```

## Resend Webhook

Register this URL in [Resend Dashboard → Webhooks](https://resend.com/webhooks):

- **URL:** `https://tamma.me/api/webhooks/resend`
- **Events:** `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`

## Troubleshooting

- **Bounces increasing:** Check Resend dashboard for bounce reasons. Hard bounces = invalid emails. Soft bounces = temporary mailbox issues.
- **Supabase still showing bounce warning:** Takes 24-48h to clear after switching to custom SMTP. New sends through Resend won't affect the Supabase counter.
- **Rate limits:** Resend free tier = 100 emails/day, 3,000/month. Pro tier = 50,000/month. Check plan limits before large sends.
- **Domain not verified:** DNS propagation can take up to 48h. Use `onboarding@resend.dev` as temporary fallback.
