-- Performance indexes for frequently filtered columns
-- Run this migration to improve query performance across the platform

-- tracked_links: heavily used in campaign analytics and echo stats
CREATE INDEX IF NOT EXISTS idx_tracked_links_campaign_id ON tracked_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tracked_links_echo_id ON tracked_links(echo_id);

-- sent_emails: checked on every cron run to prevent duplicate sends
CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id_type ON sent_emails(user_id, email_type);

-- users: referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- payouts: filtered by status and ordered by date in finance/stats routes
CREATE INDEX IF NOT EXISTS idx_payouts_status_created ON payouts(status, created_at DESC);

-- clicks: filtered by validity and date range in analytics
CREATE INDEX IF NOT EXISTS idx_clicks_is_valid_created ON clicks(is_valid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);

-- campaigns: filtered by batteur_id in brand dashboard
CREATE INDEX IF NOT EXISTS idx_campaigns_batteur_id ON campaigns(batteur_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
