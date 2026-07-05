-- Tamtam production schema — REFERENCE SNAPSHOT (2026-07-05)
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
--
-- Source: Supabase dashboard schema export provided by the project owner.
-- The live schema is managed in Supabase; keep this file refreshed after
-- schema changes (or replace this workflow with `supabase db pull`).
-- Hand-written row types in lib/types.ts should stay in sync with this file.

CREATE TABLE public.users (
  id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['echo'::text, 'batteur'::text, 'admin'::text, 'superadmin'::text])),
  name text NOT NULL,
  phone text,
  city text,
  mobile_money_provider text CHECK (mobile_money_provider = ANY (ARRAY['wave'::text, 'orange_money'::text])),
  balance integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'verified'::text, 'flagged'::text, 'suspended'::text])),
  risk_level text DEFAULT 'low'::text CHECK (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  total_recharged integer DEFAULT 0,
  tier text DEFAULT 'echo'::text CHECK (tier = ANY (ARRAY['echo'::text, 'argent'::text, 'or'::text, 'diamant'::text])),
  total_valid_clicks integer DEFAULT 0,
  total_campaigns_joined integer DEFAULT 0,
  referred_by uuid,
  referral_count integer DEFAULT 0,
  tier_bonus_percent numeric DEFAULT 0,
  terms_accepted_at timestamp with time zone,
  referral_code text UNIQUE,
  team_position text,
  team_permissions jsonb DEFAULT '[]'::jsonb,
  crm_stage text DEFAULT 'onboarding'::text CHECK (crm_stage = ANY (ARRAY['onboarding'::text, 'active'::text, 'at_risk'::text, 'churned'::text])),
  crm_tags ARRAY DEFAULT '{}'::text[],
  logo_url text,
  industry text,
  notification_prefs jsonb DEFAULT '{"notify_new_echos": false, "notify_weekly_summary": true, "notify_campaign_complete": true}'::jsonb,
  company_name text,
  referred_by_ambassador uuid,
  brand_owner_id uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deletion_reason text,
  original_email text,
  interests_completed_at timestamp with time zone,
  is_founding_echo boolean DEFAULT false,
  interests_prompt_dismissed_at timestamp with time zone,
  signup_tm_ref text,
  tier_perks jsonb DEFAULT '{}'::jsonb,
  successful_referrals integer DEFAULT 0,
  leaderboard_notify boolean DEFAULT true,
  available_balance integer DEFAULT 0,
  pending_balance integer DEFAULT 0,
  platforms ARRAY DEFAULT '{}'::text[],
  primary_platform text,
  audience_size_range text,
  last_used_brand_id uuid,
  sms_optout boolean DEFAULT false,
  sms_optout_at timestamp with time zone,
  last_sms_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_last_used_brand_id_fkey FOREIGN KEY (last_used_brand_id) REFERENCES public.users(id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id),
  CONSTRAINT users_referred_by_ambassador_fkey FOREIGN KEY (referred_by_ambassador) REFERENCES public.ambassadors(id),
  CONSTRAINT users_brand_owner_id_fkey FOREIGN KEY (brand_owner_id) REFERENCES public.users(id),
  CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id)
);
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batteur_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  destination_url text NOT NULL,
  creative_urls ARRAY DEFAULT '{}'::text[],
  cpc integer NOT NULL,
  budget integer NOT NULL,
  spent integer DEFAULT 0,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text, 'rejected'::text])),
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  moderation_status text DEFAULT 'pending'::text CHECK (moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  moderation_reason text,
  moderated_by uuid,
  moderated_at timestamp with time zone,
  target_cities ARRAY,
  objective text NOT NULL DEFAULT 'traffic'::text CHECK (objective = ANY (ARRAY['awareness'::text, 'traffic'::text, 'lead_generation'::text])),
  cost_per_lead_fcfa integer,
  leads_captured_count integer DEFAULT 0,
  setup_fee_paid boolean DEFAULT false,
  setup_fee_amount_fcfa integer,
  low_conversion_flagged boolean DEFAULT false,
  landing_page_id uuid,
  pixel_id text,
  tracked_events ARRAY DEFAULT '{}'::text[],
  pricing_model text NOT NULL DEFAULT 'cpc'::text CHECK (pricing_model = ANY (ARRAY['cpc'::text, 'cpa'::text])),
  cpa_amount integer CHECK (cpa_amount IS NULL OR cpa_amount >= 100),
  cpa_event text CHECK (cpa_event IS NULL OR cpa_event ~ '^[a-z_]+$'::text),
  CONSTRAINT campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT campaigns_batteur_id_fkey FOREIGN KEY (batteur_id) REFERENCES public.users(id),
  CONSTRAINT campaigns_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.users(id),
  CONSTRAINT campaigns_landing_page_id_fkey FOREIGN KEY (landing_page_id) REFERENCES public.landing_pages(id),
  CONSTRAINT campaigns_pixel_id_fkey FOREIGN KEY (pixel_id) REFERENCES public.pixels(pixel_id)
);
CREATE TABLE public.tracked_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  echo_id uuid NOT NULL,
  short_code text NOT NULL UNIQUE,
  click_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  tm_ref text,
  CONSTRAINT tracked_links_pkey PRIMARY KEY (id),
  CONSTRAINT tracked_links_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT tracked_links_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  is_valid boolean DEFAULT true,
  country text,
  created_at timestamp with time zone DEFAULT now(),
  rejection_reason text,
  CONSTRAINT clicks_pkey PRIMARY KEY (id),
  CONSTRAINT clicks_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.tracked_links(id)
);
CREATE TABLE public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  echo_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  provider text CHECK (provider = ANY (ARRAY['wave'::text, 'orange_money'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  paytech_transfer_id text,
  paytech_token text,
  external_id text,
  failure_reason text,
  completed_at timestamp with time zone,
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.blocked_ips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  block_type text DEFAULT 'manual'::text CHECK (block_type = ANY (ARRAY['manual'::text, 'bot'::text, 'datacenter'::text, 'temporary'::text])),
  expires_at timestamp with time zone,
  click_count integer DEFAULT 0,
  carrier_ip boolean DEFAULT false,
  CONSTRAINT blocked_ips_pkey PRIMARY KEY (id),
  CONSTRAINT blocked_ips_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.users(id)
);
CREATE TABLE public.platform_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT platform_settings_pkey PRIMARY KEY (key),
  CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid,
  amount integer NOT NULL,
  ref_command text NOT NULL UNIQUE,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text, 'failed'::text])),
  payment_method text,
  client_phone text,
  paytech_token text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT payments_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'replied'::text, 'closed'::text])),
  admin_reply text,
  replied_by uuid,
  replied_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT support_tickets_replied_by_fkey FOREIGN KEY (replied_by) REFERENCES public.users(id)
);
CREATE TABLE public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text DEFAULT 'medium'::text CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  ip_address text,
  user_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT security_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT admin_activity_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id)
);
CREATE TABLE public.brand_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  message text,
  status text DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'contacted'::text, 'converted'::text, 'rejected'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  tags ARRAY DEFAULT '{}'::text[],
  CONSTRAINT brand_leads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.roadmap_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phase text NOT NULL,
  phase_label text NOT NULL,
  metric_key text NOT NULL,
  metric_label text NOT NULL,
  target_value integer NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roadmap_goals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.roadmap_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  phase text NOT NULL,
  achieved boolean DEFAULT false,
  achieved_at timestamp with time zone,
  target_date date,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roadmap_milestones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.echo_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  echo_id uuid NOT NULL UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_campaign_date date,
  streak_updated_at timestamp with time zone DEFAULT now(),
  week_reward_paid boolean DEFAULT false,
  month_reward_paid boolean DEFAULT false,
  quarter_reward_paid boolean DEFAULT false,
  quarter_start_date date DEFAULT CURRENT_DATE,
  CONSTRAINT echo_streaks_pkey PRIMARY KEY (id),
  CONSTRAINT echo_streaks_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.gamification_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon text,
  reward_fcfa integer NOT NULL DEFAULT 0,
  condition_type text NOT NULL,
  condition_value integer NOT NULL,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gamification_milestones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.echo_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  echo_id uuid NOT NULL,
  milestone_id uuid NOT NULL,
  reward_fcfa integer NOT NULL,
  achieved_at timestamp with time zone DEFAULT now(),
  reward_credited boolean DEFAULT false,
  CONSTRAINT echo_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT echo_achievements_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id),
  CONSTRAINT echo_achievements_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.gamification_milestones(id)
);
CREATE TABLE public.streak_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  echo_id uuid NOT NULL,
  streak_count integer NOT NULL,
  reward_fcfa integer NOT NULL,
  credited_at timestamp with time zone DEFAULT now(),
  CONSTRAINT streak_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT streak_rewards_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.carrier_ip_ranges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  carrier text NOT NULL,
  ip_prefix text NOT NULL,
  country text DEFAULT 'SN'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carrier_ip_ranges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.crm_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  contact_type text NOT NULL CHECK (contact_type = ANY (ARRAY['lead'::text, 'brand'::text])),
  author_id uuid NOT NULL,
  content text NOT NULL,
  note_type text DEFAULT 'note'::text CHECK (note_type = ANY (ARRAY['note'::text, 'call'::text, 'followup'::text, 'email'::text, 'meeting'::text])),
  followup_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crm_notes_pkey PRIMARY KEY (id),
  CONSTRAINT crm_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);
CREATE TABLE public.verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  type text DEFAULT 'brand_signup'::text,
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  attempts integer DEFAULT 0,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL DEFAULT 'bonus'::text,
  description text,
  status text NOT NULL DEFAULT 'completed'::text,
  created_at timestamp with time zone DEFAULT now(),
  source_id text,
  source_type text,
  created_by uuid,
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sent_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_type text NOT NULL,
  campaign_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sent_emails_pkey PRIMARY KEY (id),
  CONSTRAINT sent_emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT sent_emails_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.ambassadors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  referral_code text NOT NULL UNIQUE,
  commission_rate numeric DEFAULT 5.0,
  status text DEFAULT 'active'::text,
  total_referrals integer DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ambassadors_pkey PRIMARY KEY (id),
  CONSTRAINT ambassadors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.ambassador_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL,
  brand_user_id uuid NOT NULL,
  referral_code text NOT NULL,
  signed_up_at timestamp with time zone DEFAULT now(),
  first_campaign_at timestamp with time zone,
  status text DEFAULT 'signed_up'::text,
  total_campaigns integer DEFAULT 0,
  total_commission_earned numeric DEFAULT 0,
  CONSTRAINT ambassador_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT ambassador_referrals_ambassador_id_fkey FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id),
  CONSTRAINT ambassador_referrals_brand_user_id_fkey FOREIGN KEY (brand_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.ambassador_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL,
  referral_id uuid,
  campaign_id uuid NOT NULL,
  campaign_budget numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text DEFAULT 'earned'::text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ambassador_commissions_pkey PRIMARY KEY (id),
  CONSTRAINT ambassador_commissions_ambassador_id_fkey FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id),
  CONSTRAINT ambassador_commissions_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.ambassador_referrals(id)
);
CREATE TABLE public.brand_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  brand_owner_id uuid NOT NULL,
  member_user_id uuid,
  email text NOT NULL,
  status text DEFAULT 'invited'::text,
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  removed_at timestamp with time zone,
  invited_by uuid,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'viewer'::text])),
  permissions jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT brand_team_members_pkey PRIMARY KEY (id),
  CONSTRAINT brand_team_members_brand_owner_id_fkey FOREIGN KEY (brand_owner_id) REFERENCES public.users(id),
  CONSTRAINT brand_team_members_member_user_id_fkey FOREIGN KEY (member_user_id) REFERENCES public.users(id),
  CONSTRAINT brand_team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id)
);
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_id uuid,
  theme text DEFAULT 'easter_egg'::text,
  status text DEFAULT 'draft'::text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  total_budget numeric NOT NULL,
  budget_spent numeric DEFAULT 0,
  clicks_per_reward integer DEFAULT 10,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT challenges_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.challenge_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  tier text NOT NULL,
  amount numeric NOT NULL,
  total_quantity integer NOT NULL,
  remaining_quantity integer NOT NULL,
  emoji text DEFAULT '🥚'::text,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenge_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT challenge_rewards_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.challenge_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  echo_id uuid NOT NULL,
  valid_clicks integer DEFAULT 0,
  eggs_earned integer DEFAULT 0,
  total_won numeric DEFAULT 0,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenge_participants_pkey PRIMARY KEY (id),
  CONSTRAINT challenge_participants_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id),
  CONSTRAINT challenge_participants_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.challenge_egg_cracks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL,
  echo_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  amount numeric NOT NULL,
  tier text NOT NULL,
  cracked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT challenge_egg_cracks_pkey PRIMARY KEY (id),
  CONSTRAINT challenge_egg_cracks_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id),
  CONSTRAINT challenge_egg_cracks_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id),
  CONSTRAINT challenge_egg_cracks_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.challenge_rewards(id)
);
CREATE TABLE public.interest_categories (
  id text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  emoji text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interest_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.content_signals (
  id text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  emoji text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT content_signals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.echo_interests (
  echo_id uuid NOT NULL,
  interest_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT echo_interests_pkey PRIMARY KEY (echo_id, interest_id),
  CONSTRAINT echo_interests_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id),
  CONSTRAINT echo_interests_interest_id_fkey FOREIGN KEY (interest_id) REFERENCES public.interest_categories(id)
);
CREATE TABLE public.echo_content_signals (
  echo_id uuid NOT NULL,
  signal_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT echo_content_signals_pkey PRIMARY KEY (echo_id, signal_id),
  CONSTRAINT echo_content_signals_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id),
  CONSTRAINT echo_content_signals_signal_id_fkey FOREIGN KEY (signal_id) REFERENCES public.content_signals(id)
);
CREATE TABLE public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_line text NOT NULL,
  template_key text NOT NULL,
  target_segment text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT email_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.email_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  resend_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_sends_pkey PRIMARY KEY (id),
  CONSTRAINT email_sends_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id),
  CONSTRAINT email_sends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.wave_checkouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id uuid,
  wave_checkout_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XOF'::text,
  client_reference text,
  checkout_status text NOT NULL DEFAULT 'open'::text,
  payment_status text,
  wave_launch_url text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  expires_at timestamp with time zone,
  CONSTRAINT wave_checkouts_pkey PRIMARY KEY (id),
  CONSTRAINT wave_checkouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT wave_checkouts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);
CREATE TABLE public.wave_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payout_id uuid,
  user_id uuid NOT NULL,
  wave_payout_id text UNIQUE,
  idempotency_key uuid NOT NULL UNIQUE,
  amount integer NOT NULL,
  fee integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XOF'::text,
  mobile text NOT NULL,
  client_reference text,
  payout_status text NOT NULL DEFAULT 'pending'::text,
  error_code text,
  error_message text,
  receipt_url text,
  wave_transaction_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT wave_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT wave_payouts_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id),
  CONSTRAINT wave_payouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.wave_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wave_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wave_webhook_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reconciliation_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  computed_at timestamp with time zone DEFAULT now(),
  brand_balance_total bigint NOT NULL,
  echo_balance_total bigint NOT NULL,
  platform_liabilities_total bigint NOT NULL,
  wave_checkouts_total bigint NOT NULL,
  wave_checkouts_count integer NOT NULL,
  wave_payouts_total bigint NOT NULL,
  wave_payouts_count integer NOT NULL,
  wave_fees_total bigint NOT NULL,
  wave_wallet_expected bigint NOT NULL,
  total_discrepancy bigint NOT NULL DEFAULT 0,
  critical_issues_count integer NOT NULL DEFAULT 0,
  warning_issues_count integer NOT NULL DEFAULT 0,
  info_issues_count integer NOT NULL DEFAULT 0,
  compute_duration_ms integer,
  scan_type text NOT NULL DEFAULT 'full'::text,
  CONSTRAINT reconciliation_snapshots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reconciliation_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text])),
  category text NOT NULL,
  subject_type text,
  subject_id text,
  description text NOT NULL,
  expected_value bigint,
  actual_value bigint,
  discrepancy bigint,
  suggested_action text,
  auto_healable boolean DEFAULT false,
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_note text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reconciliation_issues_pkey PRIMARY KEY (id),
  CONSTRAINT reconciliation_issues_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.reconciliation_snapshots(id)
);
CREATE TABLE public.reconciliation_auto_heals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  issue_id uuid,
  action text NOT NULL,
  subject_type text,
  subject_id text,
  before_state jsonb,
  after_state jsonb,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reconciliation_auto_heals_pkey PRIMARY KEY (id),
  CONSTRAINT reconciliation_auto_heals_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.reconciliation_issues(id)
);
CREATE TABLE public.financial_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  gross_revenue bigint NOT NULL DEFAULT 0,
  tamtam_commission bigint NOT NULL DEFAULT 0,
  ambassador_commissions bigint NOT NULL DEFAULT 0,
  net_revenue bigint NOT NULL DEFAULT 0,
  echo_payouts bigint NOT NULL DEFAULT 0,
  wave_checkout_fees bigint NOT NULL DEFAULT 0,
  wave_payout_fees bigint NOT NULL DEFAULT 0,
  welcome_bonuses bigint NOT NULL DEFAULT 0,
  challenge_rewards bigint NOT NULL DEFAULT 0,
  clicks_verified integer NOT NULL DEFAULT 0,
  clicks_invalid integer NOT NULL DEFAULT 0,
  brands_active integer NOT NULL DEFAULT 0,
  echos_active integer NOT NULL DEFAULT 0,
  new_brands integer NOT NULL DEFAULT 0,
  new_echos integer NOT NULL DEFAULT 0,
  gross_margin bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT financial_snapshots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reconciliation_alerts_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alert_key text NOT NULL UNIQUE,
  severity text NOT NULL,
  subject text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reconciliation_alerts_sent_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_generation_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  input_hash text NOT NULL UNIQUE,
  result jsonb NOT NULL,
  model_used text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_generation_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  month text NOT NULL,
  total_cost_usd numeric DEFAULT 0,
  call_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.users(id)
);
CREATE TABLE public.landing_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE,
  batteur_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  headline text NOT NULL,
  subheadline text,
  description text,
  cta_text text NOT NULL,
  brand_color text NOT NULL,
  logo_url text,
  form_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  notification_phone text,
  notification_email text,
  ai_generation_id uuid,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  template text NOT NULL DEFAULT 'simple'::text CHECK (template = ANY (ARRAY['simple'::text, 'product'::text, 'event'::text, 'app'::text, 'contact'::text])),
  hero_image_url text,
  landing_page_approved boolean NOT NULL DEFAULT false,
  brand_accent_color text,
  CONSTRAINT landing_pages_pkey PRIMARY KEY (id),
  CONSTRAINT landing_pages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT landing_pages_batteur_id_fkey FOREIGN KEY (batteur_id) REFERENCES public.users(id),
  CONSTRAINT landing_pages_ai_generation_id_fkey FOREIGN KEY (ai_generation_id) REFERENCES public.ai_generation_cache(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  landing_page_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  tracked_link_id uuid,
  echo_id uuid,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  custom_fields jsonb,
  ip_address text,
  user_agent text,
  consent_given boolean NOT NULL,
  fraud_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'flagged'::text])),
  rejection_reason text,
  verified_at timestamp with time zone,
  payout_amount integer,
  payout_status text CHECK (payout_status IS NULL OR (payout_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text]))),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_landing_page_id_fkey FOREIGN KEY (landing_page_id) REFERENCES public.landing_pages(id),
  CONSTRAINT leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT leads_tracked_link_id_fkey FOREIGN KEY (tracked_link_id) REFERENCES public.tracked_links(id),
  CONSTRAINT leads_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  echo_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'none'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text, 'pending'::text, 'manual'::text])),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT notification_logs_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_recharges_fcfa integer DEFAULT 0,
  total_spend_fcfa integer DEFAULT 0,
  total_refunds_fcfa integer DEFAULT 0,
  net_amount_fcfa integer DEFAULT 0,
  campaign_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'final'::text CHECK (status = ANY (ARRAY['draft'::text, 'final'::text])),
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.users(id)
);
CREATE TABLE public.invoice_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  campaign_id uuid,
  campaign_name text NOT NULL,
  objective text,
  period text,
  clicks integer DEFAULT 0,
  leads integer DEFAULT 0,
  cpc_fcfa integer,
  cpl_fcfa integer,
  total_spend_fcfa integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT invoice_line_items_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.pixels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  name text NOT NULL,
  pixel_id text NOT NULL UNIQUE,
  api_key_hash text NOT NULL,
  platform text NOT NULL DEFAULT 'app'::text CHECK (platform = ANY (ARRAY['app'::text, 'web'::text, 'both'::text])),
  allowed_events ARRAY DEFAULT ARRAY['install'::text, 'signup'::text, 'activation'::text, 'subscription'::text, 'purchase'::text, 'lead'::text, 'custom'::text, 'test'::text],
  webhook_url text,
  is_active boolean DEFAULT true,
  total_conversions integer DEFAULT 0,
  last_conversion_at timestamp with time zone,
  last_test_at timestamp with time zone,
  test_status text DEFAULT 'pending'::text CHECK (test_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text])),
  test_count integer DEFAULT 0,
  last_test_error text,
  last_test_latency_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pixels_pkey PRIMARY KEY (id),
  CONSTRAINT pixels_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.users(id)
);
CREATE TABLE public.conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pixel_id text NOT NULL,
  brand_id uuid NOT NULL,
  campaign_id uuid,
  echo_id uuid,
  tracked_link_id uuid,
  event text NOT NULL,
  event_name text,
  value_amount numeric,
  value_currency text DEFAULT 'XOF'::text,
  tm_ref text,
  attribution_window_hours integer DEFAULT 168,
  attributed boolean DEFAULT false,
  attribution_type text CHECK (attribution_type = ANY (ARRAY['direct'::text, 'assisted'::text, 'unattributed'::text])),
  click_to_conversion_seconds integer,
  external_id text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_status text NOT NULL DEFAULT 'none'::text CHECK (payment_status = ANY (ARRAY['none'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'duplicate'::text])),
  payment_amount integer,
  echo_earning integer,
  paid_at timestamp with time zone,
  CONSTRAINT conversions_pkey PRIMARY KEY (id),
  CONSTRAINT conversions_pixel_id_fkey FOREIGN KEY (pixel_id) REFERENCES public.pixels(pixel_id),
  CONSTRAINT conversions_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.users(id),
  CONSTRAINT conversions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT conversions_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.gamification_caps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cap_type text NOT NULL UNIQUE CHECK (cap_type = ANY (ARRAY['daily_per_echo'::text, 'monthly_platform'::text, 'min_withdrawal'::text])),
  max_amount_fcfa integer NOT NULL,
  current_amount_fcfa integer NOT NULL DEFAULT 0,
  period_start timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gamification_caps_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pending_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  echo_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  campaign_name text,
  amount_fcfa integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'unlocked'::text, 'paid'::text])),
  unlock_date date NOT NULL,
  unlocked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pending_earnings_pkey PRIMARY KEY (id),
  CONSTRAINT pending_earnings_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id),
  CONSTRAINT pending_earnings_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.notification_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  echo_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['new_campaign'::text, 'share_reminder'::text, 'inactivity'::text, 'streak_danger'::text, 'streak_milestone'::text, 'payout_ready'::text, 'campaign_ending'::text, 'manual'::text, 'reengagement'::text])),
  campaign_id uuid,
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'suppressed'::text])),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  suppression_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_queue_pkey PRIMARY KEY (id),
  CONSTRAINT notification_queue_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id),
  CONSTRAINT notification_queue_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.notification_daily_caps (
  echo_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  send_count integer NOT NULL DEFAULT 0,
  CONSTRAINT notification_daily_caps_pkey PRIMARY KEY (echo_id, date),
  CONSTRAINT notification_daily_caps_echo_id_fkey FOREIGN KEY (echo_id) REFERENCES public.users(id)
);
CREATE TABLE public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  push_title text,
  push_body text,
  push_url text DEFAULT '/rythmes'::text,
  email_subject text,
  email_body text,
  lang text DEFAULT 'fr'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sms_test_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text NOT NULL,
  message text NOT NULL,
  sender text DEFAULT 'TamTam'::text,
  serviceid text DEFAULT '36453'::text,
  mtarget_ticket text,
  status text DEFAULT 'pending'::text,
  error_code text,
  error_message text,
  latency_ms integer,
  raw_response text,
  notes text,
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sms_test_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sms_test_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
