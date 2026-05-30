-- Notification Center — Templates table + updates
-- Adds notification_templates table for reusable message templates
-- Adds 'manual' and 'reengagement' to notification_queue type constraint

-- 1. Notification templates — reusable message templates for manual sends
CREATE TABLE IF NOT EXISTS notification_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text NOT NULL,
  push_title    text,
  push_body     text,
  push_url      text DEFAULT '/rythmes',
  email_subject text,
  email_body    text,
  lang          text DEFAULT 'fr',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. Seed default templates
INSERT INTO notification_templates (name, type, push_title, push_body, push_url, lang)
VALUES
  ('Nouvelle campagne FR', 'new_campaign',
   'Nouvelle campagne disponible !',
   '50 FCFA par clic — partagez maintenant sur votre Status',
   '/rythmes', 'fr'),
  ('Rappel de partage FR', 'share_reminder',
   'Partagez et gagnez',
   'Votre lien attend d''être partagé — 50 FCFA par clic vérifié',
   '/rythmes', 'fr'),
  ('Réengagement FR', 'reengagement',
   'Tu nous manques',
   'Des Échos à Dakar gagnent 15 000 FCFA/mois. Rejoins une campagne.',
   '/rythmes', 'fr'),
  ('Streak en danger FR', 'streak_danger',
   'Ton streak est en danger',
   'Partage aujourd''hui pour ne pas perdre ta série',
   '/dashboard', 'fr');

-- 3. Update notification_queue type constraint to include 'manual' and 'reengagement'
ALTER TABLE notification_queue DROP CONSTRAINT IF EXISTS notification_queue_type_check;
ALTER TABLE notification_queue ADD CONSTRAINT notification_queue_type_check
  CHECK (type IN (
    'new_campaign', 'share_reminder', 'inactivity',
    'streak_danger', 'streak_milestone', 'payout_ready',
    'campaign_ending', 'manual', 'reengagement'
  ));

-- 4. Platform settings for notification center
INSERT INTO platform_settings (key, value)
VALUES
  ('notification_quiet_start', '23'),
  ('notification_quiet_end', '6'),
  ('notification_daily_cap', '2')
ON CONFLICT (key) DO NOTHING;
