-- Smart Share tracking columns on tracked_links
ALTER TABLE tracked_links ADD COLUMN IF NOT EXISTS last_share_method text;
ALTER TABLE tracked_links ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0;
