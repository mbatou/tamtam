/**
 * Compile-time schema sync.
 *
 * Binds the hand-written row interfaces in lib/types.ts to the GENERATED
 * database types (types/database.ts, produced by `npm run db:types`). If a
 * hand-written interface references a column that doesn't exist in the real
 * schema, `npm run typecheck` fails and the offending property name appears
 * in the error message.
 *
 * This is the strong version of the regex drift test in
 * __tests__/schema-drift.test.ts: it checks against the live-generated
 * schema instead of a hand-refreshed snapshot. After schema changes, run
 * `npm run db:types` and commit the regenerated file.
 *
 * (Key-presence only, by design: the hand-written types intentionally
 * narrow — e.g. status unions instead of plain string — which is fine.)
 */

import type { Database } from "./database";
import type {
  User,
  Campaign,
  TrackedLink,
  Click,
  Payout,
  Payment,
  Conversion,
  Lead,
  PlatformSetting,
} from "@/lib/types";

type Tables = Database["public"]["Tables"];

/** Resolves to `never` when every key of Hand exists on Row; otherwise to the missing key names. */
type MissingKeys<Hand, Row> = Exclude<keyof Hand, keyof Row>;

/** Fails to compile unless T is never — the error shows the missing column names. */
type ExpectNoMissing<T extends never> = T;

/* eslint-disable @typescript-eslint/no-unused-vars */
type _UserSync = ExpectNoMissing<MissingKeys<User, Tables["users"]["Row"]>>;
type _CampaignSync = ExpectNoMissing<MissingKeys<Campaign, Tables["campaigns"]["Row"]>>;
type _TrackedLinkSync = ExpectNoMissing<MissingKeys<TrackedLink, Tables["tracked_links"]["Row"]>>;
type _ClickSync = ExpectNoMissing<MissingKeys<Click, Tables["clicks"]["Row"]>>;
type _PayoutSync = ExpectNoMissing<MissingKeys<Payout, Tables["payouts"]["Row"]>>;
type _PaymentSync = ExpectNoMissing<MissingKeys<Payment, Tables["payments"]["Row"]>>;
type _ConversionSync = ExpectNoMissing<MissingKeys<Conversion, Tables["conversions"]["Row"]>>;
type _LeadSync = ExpectNoMissing<MissingKeys<Lead, Tables["leads"]["Row"]>>;
type _PlatformSettingSync = ExpectNoMissing<MissingKeys<PlatformSetting, Tables["platform_settings"]["Row"]>>;
/* eslint-enable @typescript-eslint/no-unused-vars */

export {};
