# Wave API Integration Setup

## 1. Wave Business Account

1. Go to [Wave Business](https://business.wave.com) and create/log into your merchant account
2. Navigate to **Settings > API Keys**
3. Generate an API key for production use
4. Note your **Merchant ID** (visible in dashboard URL)

## 2. Environment Variables

Add these to your `.env.local` and Vercel environment:

```env
WAVE_API_KEY=wave_sn_prod_xxxxxxxxxxxxxxxx
WAVE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
WAVE_SIGNING_SECRET=sign_xxxxxxxxxxxxxxxx   # Optional, for request signing
```

## 3. Database Migration

Run the migration in **Supabase SQL Editor**:

```
File: supabase/wave_integration_migration.sql
```

This creates:
- `wave_checkouts` — tracks brand recharge checkout sessions
- `wave_payouts` — tracks écho withdrawal payouts
- `wave_webhook_events` — idempotent webhook event log
- RPC functions for atomic wallet operations

## 4. Webhook Setup

1. In Wave Business dashboard, go to **Settings > Webhooks**
2. Add endpoint: `https://www.tamma.me/api/webhooks/wave`
3. Select events:
   - `checkout.session.completed`
   - `payout.completed`
   - `payout.failed`
   - `payout.reversed`
4. Copy the **webhook secret** to `WAVE_WEBHOOK_SECRET`

## 5. How It Works

### Brand Recharge (Checkout)
1. Brand clicks "Recharge" → POST `/api/payments/request`
2. API creates Wave Checkout Session → returns `wave_launch_url`
3. Brand is redirected to Wave's payment page
4. On completion, Wave sends webhook → `POST /api/webhooks/wave`
5. Webhook handler credits wallet atomically via `credit_wallet_from_checkout` RPC
6. **Important**: Wallet credit happens from webhook, NOT from success_url redirect

### Écho Withdrawal (Payout)
1. Écho requests withdrawal → POST `/api/echo/payouts`
2. API generates idempotency key, stores it BEFORE calling Wave
3. Atomic wallet debit via `debit_wallet_for_payout` RPC
4. Calls Wave Payout API with idempotency key
5. On success/failure, Wave sends webhook → updates status
6. Failed payouts are auto-refunded via `refund_wallet_from_payout` RPC
7. **Important**: On network timeout, payout stays "processing" — NEVER auto-refund

### Fallback
- If `WAVE_API_KEY` is not set, the legacy static Wave payment link is used for recharges
- If provider is `orange_money`, the legacy manual flow is used for withdrawals

## 6. Superadmin Reconciliation

Navigate to `/superadmin/wave-reconciliation` to:
- View checkout and payout statuses
- Monitor processing payouts (potential timeouts)
- Check unprocessed webhook events
- Review failed/reversed payouts

## 7. Troubleshooting

### "Processing" payouts stuck
1. Check Wave Business dashboard for the payout status
2. If Wave shows "completed", the webhook may have failed — check `wave_webhook_events`
3. NEVER manually refund without confirming with Wave first

### Webhook not arriving
1. Verify the webhook URL in Wave dashboard
2. Check that `WAVE_WEBHOOK_SECRET` matches
3. Look at Vercel function logs for `/api/webhooks/wave`

### Checkout not crediting wallet
1. Check `wave_checkouts` table — is `checkout_status` still "open"?
2. Verify webhook event in `wave_webhook_events` — was it processed?
3. Check if `payment_status` is "succeeded" in the event data

## 8. Fee Structure

- **Checkout (recharge)**: No fees charged to brands
- **Payout (withdrawal)**: 1% fee deducted from withdrawal amount
  - Example: 10,000 FCFA withdrawal → 100 FCFA fee → 9,900 FCFA sent to écho
  - Fee is shown to écho before confirming withdrawal
