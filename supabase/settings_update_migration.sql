-- Update min payout from 500 to 1000 FCFA
UPDATE platform_settings SET value = '1000' WHERE key = 'min_payout_fcfa' AND value = '500';

-- Add referral program toggle setting
INSERT INTO platform_settings (key, value) VALUES
  ('referral_program_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
